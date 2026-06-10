import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { createSupabaseServer } from "./supabase/server";

const DEV_COOKIE = "devstats_dev_uid";

/**
 * Resolve the current user.
 *  1. If Supabase env is configured, prefer the Supabase session.
 *  2. Otherwise, fall back to a dev cookie that points at a local User row.
 *     Lets you click around before pasting Supabase keys.
 */
export async function getCurrentUser() {
  const sb = createSupabaseServer();
  if (sb) {
    const { data } = await sb.auth.getUser();
    const u = data.user;
    if (!u) return null;
    return prisma.user.upsert({
      where: { email: u.email ?? `${u.id}@unknown.local` },
      update: {},
      create: {
        email: u.email ?? `${u.id}@unknown.local`,
        username: deriveUsername(u.email ?? u.id),
        avatarUrl: (u.user_metadata as any)?.avatar_url ?? null,
      },
    });
  }

  // Dev fallback.
  const uid = cookies().get(DEV_COOKIE)?.value;
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}

export async function ensureDevUser() {
  const existing = cookies().get(DEV_COOKIE)?.value;
  if (existing) {
    const u = await prisma.user.findUnique({ where: { id: existing } });
    if (u) return u;
  }
  const handle = `operator-${randomBytes(2).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      email: `${handle}@local.devstats`,
      username: handle,
    },
  });
  cookies().set(DEV_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return user;
}

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** Authenticate an /api request from the CLI via `Authorization: Bearer <key>`. */
export async function getUserFromApiKey(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const hash = hashApiKey(auth.slice(7).trim());
  return prisma.user.findUnique({ where: { apiKeyHash: hash } });
}

function deriveUsername(seed: string) {
  const base = seed.split("@")[0]!.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
  return base || `op-${randomBytes(3).toString("hex")}`;
}
