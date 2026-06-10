import { NextResponse } from "next/server";
import { getLeaderboard, type LbMetric, type LbPeriod } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

const PERIODS: LbPeriod[] = ["weekly", "alltime"];
const METRICS: LbMetric[] = ["tokens", "sessions", "duration", "lines"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "weekly";
  const metric = url.searchParams.get("metric") ?? "tokens";

  if (!PERIODS.includes(period as LbPeriod)) {
    return NextResponse.json({ error: "bad period" }, { status: 400 });
  }
  if (!METRICS.includes(metric as LbMetric)) {
    return NextResponse.json({ error: "bad metric" }, { status: 400 });
  }

  const rows = await getLeaderboard(period as LbPeriod, metric as LbMetric);
  return NextResponse.json({ period, metric, rows });
}
