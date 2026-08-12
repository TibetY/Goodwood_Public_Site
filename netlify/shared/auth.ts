// Authentication + role checks for Netlify Functions.
//
// Wraps the Bearer-token pattern already used across the portal functions
// (see netlify/functions/invite-member.ts) and adds the role lookup introduced
// by sql/001_roles.sql.

import type { HandlerEvent } from '@netlify/functions';
import { getServiceClient } from './supabase';

export type Role = 'site_admin' | 'event_admin';

export interface AuthedUser {
  id: string;
  email: string;
  roles: Role[];
}

/** Discriminated result so callers can return the failure response verbatim. */
export type AuthResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; statusCode: 401 | 403; error: string };

function bearerToken(event: HandlerEvent): string | null {
  // Header casing varies between the Netlify runtime and `netlify dev`.
  const header = event.headers?.authorization || event.headers?.Authorization;
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

/** Resolve the caller from their access token, including their roles. */
export async function requireUser(event: HandlerEvent): Promise<AuthResult> {
  const token = bearerToken(event);
  if (!token) return { ok: false, statusCode: 401, error: 'Unauthorized' };

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { ok: false, statusCode: 401, error: 'Unauthorized' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    console.error('auth: failed to load profile roles', profileError);
    return { ok: false, statusCode: 403, error: 'Forbidden' };
  }

  return {
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email || '',
      roles: (profile?.roles || []) as Role[],
    },
  };
}

/** Resolve the caller and require a specific role. */
export async function requireRole(event: HandlerEvent, role: Role): Promise<AuthResult> {
  const result = await requireUser(event);
  if (!result.ok) return result;
  if (!result.user.roles.includes(role)) {
    return { ok: false, statusCode: 403, error: `Requires the ${role} role` };
  }
  return result;
}
