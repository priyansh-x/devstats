import { prisma } from "./prisma";
import { getRedis } from "./redis";

export type LbPeriod = "weekly" | "alltime";
export type LbMetric = "tokens" | "sessions" | "duration" | "lines";

export interface LbRow {
  rank: number;
  username: string;
  avatarUrl: string | null;
  score: number;
  tools: string[];
}

const TTL_SECONDS = 60 * 60; // 1h
const MAX_ROWS = 100;

export async function getLeaderboard(period: LbPeriod, metric: LbMetric): Promise<LbRow[]> {
  const cacheKey = `lb:${period}:${metric}`;
  const redis = getRedis();
  if (redis) {
    const hit = await redis.get<LbRow[]>(cacheKey);
    if (hit) return hit;
  }

  const since = period === "weekly"
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : new Date(0);

  // Aggregate at the DB layer for speed. We only consider public users.
  const grouped = await prisma.session.groupBy({
    by: ["userId", "tool"],
    where: {
      startedAt: { gte: since },
      user: { isPublic: true },
    },
    _sum: {
      tokensIn: true,
      tokensOut: true,
      durationMs: true,
      linesAdded: true,
      linesRemoved: true,
    },
    _count: { _all: true },
  });

  // Re-fold per user; keep tool list for badges.
  const byUser = new Map<string, { score: number; tools: Set<string> }>();
  for (const row of grouped) {
    const t = byUser.get(row.userId) ?? { score: 0, tools: new Set<string>() };
    t.tools.add(row.tool);
    switch (metric) {
      case "tokens":
        t.score += (row._sum.tokensIn ?? 0) + (row._sum.tokensOut ?? 0);
        break;
      case "sessions":
        t.score += row._count._all;
        break;
      case "duration":
        t.score += row._sum.durationMs ?? 0;
        break;
      case "lines":
        t.score += (row._sum.linesAdded ?? 0) + (row._sum.linesRemoved ?? 0);
        break;
    }
    byUser.set(row.userId, t);
  }

  // Fetch handles + avatars for top N.
  const ranked = [...byUser.entries()]
    .map(([userId, v]) => ({ userId, score: v.score, tools: [...v.tools] }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ROWS);

  if (ranked.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map((r) => r.userId) } },
    select: { id: true, username: true, avatarUrl: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const rows: LbRow[] = ranked.map((r, i) => {
    const u = byId.get(r.userId);
    return {
      rank: i + 1,
      username: u?.username ?? "unknown",
      avatarUrl: u?.avatarUrl ?? null,
      score: r.score,
      tools: r.tools,
    };
  });

  if (redis) await redis.set(cacheKey, rows, { ex: TTL_SECONDS });
  return rows;
}
