import { cache } from "react";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { createSupabaseServer } from "./supabase/server";
import { guessCountryCode } from "./countries";

const DEV_COOKIE = "devstats_dev_uid";

/**
 * Resolve the current user. Wrapped in React's `cache()` so multiple server
 * components in the same request share one Supabase + Postgres round-trip
 * — without this, the header + page body each pay the cost.
 *
 *  1. If Supabase env is configured, prefer the Supabase session.
 *     - On *first* sign-in, pull username/avatar/bio/location/countryCode
 *       from the GitHub provider metadata so the new user is immediately
 *       useful (real handle, flag on the leaderboard) without having to
 *       hand-fill /settings.
 *     - On subsequent sign-ins of an existing row, only *fill blanks* —
 *       never overwrite anything the user has manually edited.
 *  2. Otherwise, fall back to a dev cookie that points at a local User row.
 */
export const getCurrentUser = cache(_getCurrentUser);

async function _getCurrentUser() {
  const sb = createSupabaseServer();
  if (sb) {
    const { data } = await sb.auth.getUser();
    const u = data.user;
    if (!u) return null;
    return resolveSupabaseUser(u);
  }

  // Dev fallback.
  const uid = cookies().get(DEV_COOKIE)?.value;
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}

interface GitHubLike {
  username: string | null; // GitHub login
  avatarUrl: string | null;
  bio: string | null;
  location: string | null; // free-form "City, Country"
  countryCode: string | null; // ISO alpha-2 if guessable
}

/** Pull the GitHub-shaped fields from Supabase's `user_metadata`. Tolerant
 *  of missing keys — every field can be null. */
function extractGitHubFields(meta: Record<string, any> | null | undefined): GitHubLike {
  const m = meta ?? {};
  const username =
    (typeof m.user_name === "string" && m.user_name) ||
    (typeof m.preferred_username === "string" && m.preferred_username) ||
    null;
  const avatarUrl = (typeof m.avatar_url === "string" && m.avatar_url) || null;
  const bio = (typeof m.bio === "string" && m.bio.trim().slice(0, 160)) || null;
  const location = (typeof m.location === "string" && m.location.trim().slice(0, 80)) || null;
  const countryCode = guessCountryCode(location);
  return { username, avatarUrl, bio, location, countryCode };
}

async function resolveSupabaseUser(u: { id: string; email?: string | null; user_metadata: any }) {
  const email = u.email ?? `${u.id}@unknown.local`;
  const gh = extractGitHubFields(u.user_metadata);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Fill in blanks only — preserve every manual edit.
    const patch: Record<string, any> = {};
    if (!existing.avatarUrl   && gh.avatarUrl)   patch.avatarUrl   = gh.avatarUrl;
    if (!existing.bio         && gh.bio)         patch.bio         = gh.bio;
    if (!existing.location    && gh.location)    patch.location    = gh.location;
    if (!existing.countryCode && gh.countryCode) patch.countryCode = gh.countryCode;
    if (Object.keys(patch).length === 0) return existing;
    return prisma.user.update({ where: { id: existing.id }, data: patch });
  }

  // New user — prefer GitHub login, fall back to email prefix.
  const desired = gh.username || deriveUsername(email);
  const username = await pickAvailableUsername(desired);

  return prisma.user.create({
    data: {
      email,
      username,
      avatarUrl: gh.avatarUrl,
      bio: gh.bio,
      location: gh.location,
      countryCode: gh.countryCode,
    },
  });
}

/** Find an unused username close to `desired`. Tries the bare value first,
 *  then up to 5 random-suffixed variants before giving up with an ugly UUID
 *  tail. Case-insensitive comparison since usernames are case-insensitive
 *  for URLs. */
async function pickAvailableUsername(desired: string): Promise<string> {
  const base = desired.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() || `op-${randomBytes(3).toString("hex")}`;
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const taken = await prisma.user.findFirst({
      where: { username: { equals: candidate, mode: "insensitive" } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${randomBytes(4).toString("hex")}`;
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
