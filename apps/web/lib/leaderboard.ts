import { prisma } from "./prisma";
import { getRedis } from "./redis";

export type LbPeriod = "daily" | "weekly" | "alltime";
export type LbMetric = "tokens" | "sessions" | "duration" | "lines";

export interface LbRow {
  rank: number;
  username: string;
  avatarUrl: string | null;
  location: string | null;
  score: number;
  tools: string[];
}

const TTL_SECONDS = 60 * 60;
const MAX_ROWS = 200;

function sinceFor(period: LbPeriod): Date {
  const ms = Date.now();
  if (period === "daily")  return new Date(ms - 24 * 60 * 60 * 1000);
  if (period === "weekly") return new Date(ms - 7 * 24 * 60 * 60 * 1000);
  return new Date(0);
}

/**
 * Aggregate the public leaderboard for one (period, metric) bucket.
 * Optionally restricted to a `userIds` allowlist (used by friends-only view).
 * Cached in Redis with a 1-hour TTL; bypassed when `userIds` is set so the
 * friends-only view is always fresh.
 */
export async function getLeaderboard(
  period: LbPeriod,
  metric: LbMetric,
  opts: { userIds?: string[] } = {},
): Promise<LbRow[]> {
  const isAllowlist = Array.isArray(opts.userIds);
  const cacheKey = `lb:${period}:${metric}`;
  const redis = getRedis();
  if (!isAllowlist && redis) {
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

  const ranked = [...byUser.entries()]
    .map(([userId, v]) => ({ userId, score: v.score, tools: [...v.tools] }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ROWS);

  if (ranked.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map((r) => r.userId) } },
    select: { id: true, username: true, avatarUrl: true, location: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const rows: LbRow[] = ranked.map((r, i) => {
    const u = byId.get(r.userId);
    return {
      rank: i + 1,
      username: u?.username ?? "unknown",
      avatarUrl: u?.avatarUrl ?? null,
      location: u?.location ?? null,
      score: r.score,
      tools: r.tools,
    };
  });

  if (!isAllowlist && redis) await redis.set(cacheKey, rows, { ex: TTL_SECONDS });
  return rows;
}

export async function refreshLeaderboard(period: LbPeriod, metric: LbMetric) {
  const redis = getRedis();
  if (redis) await redis.del(`lb:${period}:${metric}`);
  return getLeaderboard(period, metric);
}
