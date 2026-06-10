import { NextResponse } from "next/server";
import { getLeaderboard, type LbMetric, type LbPeriod } from "@/lib/leaderboard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PERIODS: LbPeriod[] = ["daily", "weekly", "alltime"];
const METRICS: LbMetric[] = ["tokens", "sessions", "duration", "lines"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "weekly") as LbPeriod;
  const metric = (url.searchParams.get("metric") ?? "tokens") as LbMetric;
  const location = url.searchParams.get("location") ?? undefined;
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const friendsOnly = url.searchParams.get("friendsOnly") === "1";

  if (!PERIODS.includes(period)) return NextResponse.json({ error: "bad period" }, { status: 400 });
  if (!METRICS.includes(metric)) return NextResponse.json({ error: "bad metric" }, { status: 400 });

  let userIds: string[] | undefined;
  if (friendsOnly) {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const edges = await prisma.friendship.findMany({
      where: { followerId: me.id },
      select: { followedId: true },
    });
    userIds = edges.map((e) => e.followedId);
    // Include myself so I see my own rank against friends.
    userIds.push(me.id);
    if (userIds.length === 1) {
      return NextResponse.json({ period, metric, rows: [], friendsOnly: true });
    }
  }

  let rows = await getLeaderboard(period, metric, { userIds });

  if (location) {
    rows = rows.filter((r) => r.location?.toLowerCase().includes(location.toLowerCase()));
  }
  if (q) {
    rows = rows.filter((r) => r.username.toLowerCase().includes(q));
  }

  // Re-rank in-place after filtering so #001 always points at the top of the
  // filtered view, not the original global rank.
  rows = rows.map((r, i) => ({ ...r, rank: i + 1 }));

  return NextResponse.json({ period, metric, rows, friendsOnly });
}
