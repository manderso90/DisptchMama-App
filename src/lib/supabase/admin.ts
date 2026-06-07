import { createClient } from '@supabase/supabase-js'

// Service-role Supabase client for trusted server-side jobs that run WITHOUT a
// user session (e.g. the cron sync). Bypasses RLS — never import this into a
// client component or expose the service-role key. The key is server-only
// (SUPABASE_SERVICE_ROLE_KEY, no NEXT_PUBLIC_ prefix).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
