import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * OAuth + magic-link callback. Supabase redirects here with ?code=...
 * We exchange the code for a session cookie, then bounce to /dashboard
 * (or wherever the `next` param points).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const sb = createSupabaseServer();
    if (sb) await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
