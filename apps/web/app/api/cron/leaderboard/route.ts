import { NextResponse } from "next/server";
import { refreshLeaderboard, type LbPeriod, type LbMetric } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

/**
 * Hourly Vercel cron — warms the Redis cache for every (period, metric) pair
 * so the public leaderboard tab switches feel instant. See vercel.json.
 *
 * Auth: Vercel sets `Authorization: Bearer <CRON_SECRET>` on cron invocations
 * when CRON_SECRET is configured as an env var. Reject anything else in prod.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const periods: LbPeriod[] = ["daily", "weekly", "monthly", "alltime"];
  const metrics: LbMetric[] = ["tokens", "sessions", "duration", "lines", "cost"];

  const results: { period: LbPeriod; metric: LbMetric; rows: number }[] = [];
  for (const p of periods) {
    for (const m of metrics) {
      // refresh (not get) — busts the stale cache entry before recomputing
      const rows = await refreshLeaderboard(p, m);
      results.push({ period: p, metric: m, rows: rows.length });
    }
  }
  return NextResponse.json({ refreshedAt: new Date().toISOString(), results });
}
