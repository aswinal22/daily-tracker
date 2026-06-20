import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for **Server Components and route handlers**.
 * Reads the session from cookies so the current user's identity is known,
 * and RLS still scopes every query to that user.
 *
 * Note: Next 14's `cookies()` is synchronous (it became async in Next 15).
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `set` method was called from a Server Component (read-only
            // cookies). Safe to ignore — middleware refreshes the session.
          }
        },
      },
    },
  );
}
