import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for **browser/client components**.
 * Uses the anon key and is subject to Row Level Security (RLS) — users
 * can only ever touch their own rows.
 *
 * Call this from "use client" components, never from Server Components or
 * route handlers (use @/lib/supabase/server there).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
