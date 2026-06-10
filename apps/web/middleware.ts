import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth cookie on every request so server components
 * always see a fresh session. No-op when env vars aren't set.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    // Skip Next internals & static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
