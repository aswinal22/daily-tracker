import { createClient } from "@supabase/supabase-js";

/**
 * Supabase service-role client — bypasses RLS.
 *
 * SERVER-ONLY. Never import this into a Client Component or any file that
 * ends up in the browser bundle. Used by cron jobs and admin operations that
 * must act across all users.
 *
 * If env vars are not configured, this throws at first use rather than
 * silently returning a broken client — fail fast on misconfiguration.
 */
let _client: ReturnType<typeof createClient> | null = null;

export function getAdminClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not set. " +
        "The admin client is server-only and requires the service role key.",
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
