import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserFromApiKey } from "@/lib/auth";
import { recomputeStreak } from "@/lib/stats";

const ToolEnum = z.enum(["CLAUDE_CODE", "CURSOR", "ANTIGRAVITY", "WINDSURF", "COPILOT", "MANUAL"]);

const SessionInput = z.object({
  tool: ToolEnum,
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  tokensIn: z.number().int().nonnegative().optional(),
  tokensInputRaw: z.number().int().nonnegative().optional(),
  tokensCacheRead: z.number().int().nonnegative().optional(),
  tokensCacheCreate: z.number().int().nonnegative().optional(),
  tokensOut: z.number().int().nonnegative().optional(),
  linesAdded: z.number().int().nonnegative().optional(),
  linesRemoved: z.number().int().nonnegative().optional(),
  model: z.string().max(120).optional(),
  projectSlug: z.string().max(64).optional(),
});

const BodySchema = z.object({
  sessions: z.array(SessionInput).max(5000),
});

export async function POST(req: Request) {
  const user = (await getUserFromApiKey(req)) ?? (await getCurrentUser());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let parsed;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch (err: any) {
    return NextResponse.json(
      { error: "invalid payload", detail: err.errors ?? String(err) },
      { status: 400 },
    );
  }

  // Dedupe within batch by (tool, startedAt).
  const seen = new Set<string>();
  const rows = parsed.sessions.filter((s) => {
    const k = `${s.tool}:${s.startedAt.toISOString()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // @@unique([userId, tool, startedAt]) gives us skipDuplicates.
  const result = await prisma.session.createMany({
    data: rows.map((r) => ({ ...r, userId: user.id })),
    skipDuplicates: true,
  });
  const inserted = result.count;

  await recomputeStreak(user.id);

  return NextResponse.json({
    received: parsed.sessions.length,
    inserted,
    skipped: parsed.sessions.length - inserted,
  });
}
