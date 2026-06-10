import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client (App Router).
 * Returns null if env not yet configured so the rest of the app can degrade
 * gracefully into "dev mode" while you finish wiring keys.
 */
export function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const store = cookies();
  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          store.set({ name, value, ...options });
        } catch {
          /* ignore in server-component contexts */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          store.set({ name, value: "", ...options });
        } catch {
          /* ignore */
        }
      },
    },
  });
}
