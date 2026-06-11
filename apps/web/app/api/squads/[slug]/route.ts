import { NextResponse } from "next/server";
import { getCurrentUser, getUserFromApiKey } from "@/lib/auth";
import { squadStandings, leaveSquad } from "@/lib/squads";
import type { LbPeriod, LbMetric } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

const PERIODS = ["daily", "weekly", "monthly", "alltime"];
const METRICS = ["tokens", "sessions", "duration", "lines"];

/** GET /api/squads/[slug] — standings. Member-only. ?period&metric. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const user = (await getUserFromApiKey(req)) ?? (await getCurrentUser());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "weekly") as LbPeriod;
  const metric = (url.searchParams.get("metric") ?? "tokens") as LbMetric;
  if (!PERIODS.includes(period) || !METRICS.includes(metric)) {
    return NextResponse.json({ error: "bad period/metric" }, { status: 400 });
  }

  try {
    const data = await squadStandings(user.id, params.slug, period, metric);
    return NextResponse.json({ ...data, period, metric });
  } catch (e: any) {
    const status = e.message === "not a member" ? 403 : 404;
    return NextResponse.json({ error: e.message }, { status });
  }
}

/** DELETE /api/squads/[slug] — leave (last member out deletes the squad). */
export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  const user = (await getUserFromApiKey(req)) ?? (await getCurrentUser());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await leaveSquad(user.id, params.slug));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}
