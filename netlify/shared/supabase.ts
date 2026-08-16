// Service-role Supabase client for Netlify Functions.
//
// Lives in netlify/shared/ rather than netlify/functions/ because netlify.toml
// points the functions directory at netlify/functions and every file there is
// deployed as its own function.
//
// The service role bypasses RLS entirely, so this client must never be created
// on the browser side and every handler that uses it is responsible for its own
// authorisation checks (see ./auth.ts).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase is not configured: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are required',
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
