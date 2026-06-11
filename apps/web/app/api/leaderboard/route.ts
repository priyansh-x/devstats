import { NextResponse } from "next/server";
import { getLeaderboard, type LbMetric, type LbPeriod } from "@/lib/leaderboard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PERIODS: LbPeriod[] = ["daily", "weekly", "monthly", "alltime"];
const METRICS: LbMetric[] = ["tokens", "sessions", "duration", "lines"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "weekly") as LbPeriod;
  const metric = (url.searchParams.get("metric") ?? "tokens") as LbMetric;
  const country = (url.searchParams.get("country") ?? "").trim().toUpperCase();
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const friendsOnly = url.searchParams.get("friendsOnly") === "1";

  if (!PERIODS.includes(period)) return NextResponse.json({ error: "bad period" }, { status: 400 });
  if (!METRICS.includes(metric)) return NextResponse.json({ error: "bad metric" }, { status: 400 });

  const me = await getCurrentUser();

  let userIds: string[] | undefined;
  if (friendsOnly) {
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

  let rows = await getLeaderboard(period, metric, {
    userIds,
    // Pin the signed-in user's true rank when they're public but fell below
    // the top-N cutoff. Only meaningful on the unfiltered global view.
    pinUserId: !friendsOnly && me?.isPublic ? me.id : undefined,
  });

  const filtered = !!country || !!q;
  if (country) {
    rows = rows.filter((r) => r.countryCode?.toUpperCase() === country);
  }
  if (q) {
    rows = rows.filter((r) => r.username.toLowerCase().includes(q));
  }

  // Re-rank only when a filter narrowed the view — #1 should be the top of
  // what you're looking at. The unfiltered view keeps true global ranks
  // (including a pinned out-of-top row, which deliberately keeps its real
  // rank rather than being renumbered).
  if (filtered) {
    rows = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  return NextResponse.json({ period, metric, rows, friendsOnly });
}
