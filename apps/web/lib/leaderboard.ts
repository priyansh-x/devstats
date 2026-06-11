import { prisma } from "./prisma";
import { getRedis } from "./redis";

export type LbPeriod = "daily" | "weekly" | "monthly" | "alltime";
export type LbMetric = "tokens" | "sessions" | "duration" | "lines";

export interface LbRow {
  rank: number;
  username: string;
  avatarUrl: string | null;
  location: string | null;
  countryCode: string | null;
  score: number;
  tools: string[];
}

const TTL_SECONDS = 60 * 60;
const MAX_ROWS = 200;

function sinceFor(period: LbPeriod): Date {
  const ms = Date.now();
  if (period === "daily")   return new Date(ms - 24 * 60 * 60 * 1000);
  if (period === "weekly")  return new Date(ms - 7 * 24 * 60 * 60 * 1000);
  if (period === "monthly") return new Date(ms - 30 * 24 * 60 * 60 * 1000);
  return new Date(0);
}

/**
 * Aggregate the public leaderboard for one (period, metric) bucket.
 *
 * Options:
 *  - `userIds` — allowlist restriction (friends-only view). Bypasses cache.
 *  - `pinUserId` — when this public user falls outside the top MAX_ROWS,
 *    append their row with its true rank so they always see where they stand.
 *    Also bypasses the cache (the cached slice doesn't know about ranks past
 *    the cutoff). Fine at current scale; revisit if leaderboard reads become
 *    hot enough to matter.
 */
export async function getLeaderboard(
  period: LbPeriod,
  metric: LbMetric,
  opts: { userIds?: string[]; pinUserId?: string } = {},
): Promise<LbRow[]> {
  const isAllowlist = Array.isArray(opts.userIds);
  const skipCache = isAllowlist || !!opts.pinUserId;
  const cacheKey = `lb:${period}:${metric}`;
  const redis = getRedis();
  if (!skipCache && redis) {
    const hit = await redis.get<LbRow[]>(cacheKey);
    if (hit) return hit;
  }

  const since = sinceFor(period);
  const grouped = await prisma.session.groupBy({
    by: ["userId", "tool"],
    where: {
      startedAt: { gte: since },
      user: { isPublic: true },
      ...(opts.userIds && opts.userIds.length > 0
        ? { userId: { in: opts.userIds } }
        : {}),
    },
    _sum: {
      tokensIn: true, tokensOut: true,
      durationMs: true, linesAdded: true, linesRemoved: true,
    },
    _count: { _all: true },
  });

  const byUser = new Map<string, { score: number; tools: Set<string> }>();
  for (const row of grouped) {
    const t = byUser.get(row.userId) ?? { score: 0, tools: new Set<string>() };
    t.tools.add(row.tool);
    switch (metric) {
      case "tokens":   t.score += (row._sum.tokensIn ?? 0) + (row._sum.tokensOut ?? 0); break;
      case "sessions": t.score += row._count._all; break;
      case "duration": t.score += row._sum.durationMs ?? 0; break;
      case "lines":    t.score += (row._sum.linesAdded ?? 0) + (row._sum.linesRemoved ?? 0); break;
    }
    byUser.set(row.userId, t);
  }

  const fullRanked = [...byUser.entries()]
    .map(([userId, v]) => ({ userId, score: v.score, tools: [...v.tools] }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const ranked = fullRanked
    .slice(0, MAX_ROWS)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Pin the requesting user's row (with true rank) if they're public, scored,
  // and fell below the cutoff.
  if (opts.pinUserId && !ranked.some((r) => r.userId === opts.pinUserId)) {
    const idx = fullRanked.findIndex((r) => r.userId === opts.pinUserId);
    if (idx >= 0) ranked.push({ ...fullRanked[idx]!, rank: idx + 1 });
  }

  if (ranked.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map((r) => r.userId) } },
    select: { id: true, username: true, avatarUrl: true, location: true, countryCode: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const rows: LbRow[] = ranked.map((r) => {
    const u = byId.get(r.userId);
    return {
      rank: r.rank,
      username: u?.username ?? "unknown",
      avatarUrl: u?.avatarUrl ?? null,
      location: u?.location ?? null,
      countryCode: u?.countryCode ?? null,
      score: r.score,
      tools: r.tools,
    };
  });

  if (!skipCache && redis) await redis.set(cacheKey, rows, { ex: TTL_SECONDS });
  return rows;
}

export async function refreshLeaderboard(period: LbPeriod, metric: LbMetric) {
  const redis = getRedis();
  if (redis) await redis.del(`lb:${period}:${metric}`);
  return getLeaderboard(period, metric);
}
