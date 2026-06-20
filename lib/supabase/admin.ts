import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

/**
 * Supabase client using the **service role key** — bypasses Row Level Security.
 *
 * ⚠️ SERVER-ONLY. Never import this in a Client Component or expose the key to
 * the browser. Use exclusively for operations that legitimately span all users:
 * the Vercel Cron jobs (daily auto-archive, Saturday revision reminders).
 *
 * The service role key is injected via `SUPABASE_SERVICE_ROLE_KEY`.
 */
export function createAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
