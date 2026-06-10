import { NextResponse } from "next/server";
import { parseClaudeCode } from "@devstats/parsers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recomputeStreak } from "@/lib/stats";

/**
 * DEV-ONLY: reads ~/.claude/projects on the same machine running `next dev`
 * and ingests all parseable sessions for the current user. Returns 403 in
 * production — that's what the CLI is for.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available in prod" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ?reset=1 wipes existing Claude Code sessions for this user — useful after
  // schema additions (cache split, etc.) so the reimport repopulates them.
  const url = new URL(req.url);
  if (url.searchParams.get("reset") === "1") {
    await prisma.session.deleteMany({ where: { userId: user.id, tool: "CLAUDE_CODE" } });
  }

  const { sessions, warnings } = await parseClaudeCode();

  const result = await prisma.session.createMany({
    data: sessions.map((s) => ({
      userId: user.id,
      tool: "CLAUDE_CODE",
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationMs: s.durationMs,
      tokensIn: s.tokensIn,
      tokensInputRaw: s.tokensInputRaw,
      tokensCacheRead: s.tokensCacheRead,
      tokensCacheCreate: s.tokensCacheCreate,
      tokensOut: s.tokensOut,
      linesAdded: s.linesAdded,
      linesRemoved: s.linesRemoved,
      model: s.model,
      projectSlug: s.projectSlug,
    })),
    skipDuplicates: true,
  });
  const inserted = result.count;

  await recomputeStreak(user.id);

  return NextResponse.json({
    parsed: sessions.length,
    inserted,
    warnings,
  });
}
