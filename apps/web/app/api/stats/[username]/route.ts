import { NextResponse } from "next/server";
import { getPublicProfile } from "@/lib/public-stats";
import { ratelimit, ipFrom } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Public read-only stats for a public operator. 404 if missing or private. */
export async function GET(
  req: Request,
  { params }: { params: { username: string } },
) {
  const gate = await ratelimit("publicProfile", ipFrom(req));
  if (!gate.ok) {
    return NextResponse.json(
      { error: "rate limited", retryAfter: gate.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }
  const profile = await getPublicProfile(params.username);
  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    username: profile.username,
    createdAt: profile.createdAt,
    stats: {
      totals: profile.stats.totals,
      streak: profile.stats.streak,
      toolBreakdown: profile.stats.toolBreakdown.map((t) => ({
        tool: t.tool, sessions: t.sessions, tokens: t.tokens,
      })),
      topModels: profile.stats.topModels.map((m) => ({
        model: m.model, sessions: m.sessions, tokens: m.tokens,
      })),
    },
  });
}
