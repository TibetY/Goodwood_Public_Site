import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireRole, type Role } from '../shared/auth';
import { getServiceClient } from '../shared/supabase';
import { badRequest, forbidden, json, methodNotAllowed, ok, serverError, parseBody } from '../shared/http';

// Grants or revokes roles on a member. Only a site_admin may call this —
// event_admin deliberately does NOT confer the ability to hand out roles.

const VALID_ROLES: Role[] = ['site_admin', 'event_admin'];

interface Payload {
  memberId?: string;
  roles?: string[];
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed();

  const auth = await requireRole(event, 'site_admin');
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });

  const payload = parseBody<Payload>(event.body);
  if (!payload) return badRequest('Invalid JSON body');

  const { memberId, roles } = payload;
  if (!memberId) return badRequest('memberId is required');
  if (!Array.isArray(roles)) return badRequest('roles must be an array');

  const invalid = roles.filter((r) => !VALID_ROLES.includes(r as Role));
  if (invalid.length) return badRequest(`Unknown role(s): ${invalid.join(', ')}`);

  // Deduplicate so the array stays clean regardless of what the client sent.
  const nextRoles = Array.from(new Set(roles)) as Role[];

  // Guard against locking the lodge out of its own portal: the last site_admin
  // cannot drop their own site_admin role.
  if (memberId === auth.user.id && !nextRoles.includes('site_admin')) {
    const supabase = getServiceClient();
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .contains('roles', ['site_admin']);

    if (error) {
      console.error('set-member-roles: failed to count site admins', error);
      return serverError();
    }
    if ((count ?? 0) <= 1) {
      return forbidden('You are the only site admin — grant the role to someone else first');
    }
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('profiles')
    .update({ roles: nextRoles, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) {
    console.error('set-member-roles: update failed', error);
    return serverError(error.message);
  }

  return ok({ ok: true, memberId, roles: nextRoles });
};
