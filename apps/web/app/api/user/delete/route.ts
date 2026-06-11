import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  // The user must type their exact handle to confirm — prevents one-click
  // accidents and CSRF-ish mistakes from doing irreversible damage.
  confirmUsername: z.string(),
});

/**
 * Permanent account deletion, as promised on /privacy.
 *
 * Deletes the Prisma User row (sessions / streak / leaderboard entries /
 * friendships all cascade via FK) and, when the account is backed by a
 * Supabase auth user, deletes that too via the service-role admin API so the
 * user can't ghost-sign-in to an empty account.
 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (body.confirmUsername !== user.username) {
    return NextResponse.json(
      { error: "confirmation does not match your handle" },
      { status: 400 },
    );
  }

  // Capture the Supabase auth user id BEFORE deleting our row.
  let supabaseUserId: string | null = null;
  const sb = createSupabaseServer();
  if (sb) {
    const { data } = await sb.auth.getUser();
    supabaseUserId = data.user?.id ?? null;
  }

  // 1) Postgres — cascades wipe sessions, streaks, leaderboard, friendships.
  await prisma.user.delete({ where: { id: user.id } });

  // 2) Supabase auth user (service role required). Best-effort: if the env
  //    isn't configured we still deleted all the data we hold.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let authDeleted = false;
  if (supabaseUserId && url && serviceKey) {
    try {
      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await admin.auth.admin.deleteUser(supabaseUserId);
      authDeleted = !error;
    } catch {
      /* data already gone; auth cleanup is best-effort */
    }
  }

  // 3) Drop the local session cookie so the browser doesn't hold a dead token.
  if (sb) await sb.auth.signOut().catch(() => {});

  return NextResponse.json({ deleted: true, authDeleted });
}
