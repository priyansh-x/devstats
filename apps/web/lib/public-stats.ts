import { prisma } from "./prisma";
import { getDashboardStats } from "./stats";
import type { DashboardStats } from "@devstats/types";

/** @public — also exported because compare/[a]/[b] re-uses the shape. */
export interface PublicProfile {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  /** Aggregate stats — cost intentionally omitted. */
  stats: Omit<DashboardStats, "totals"> & {
    totals: Omit<DashboardStats["totals"], "costUsd">;
  };
}

/**
 * Fetch a public operator's profile by username. Returns null if not found or
 * not currently public — callers should 404 on null.
 */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, avatarUrl: true, bio: true, isPublic: true, createdAt: true },
  });
  if (!user || !user.isPublic) return null;

  const stats = await getDashboardStats(user.id);
  const { costUsd: _omit, ...totalsSansCost } = stats.totals;
  return {
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
    stats: { ...stats, totals: totalsSansCost },
  };
}
