import { NextResponse } from "next/server";
import { z } from "zod";
import { parseCsv } from "@devstats/parsers";
import type { Tool } from "@devstats/types";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recomputeStreak } from "@/lib/stats";

const MappingSchema = z.object({
  startedAt: z.string().min(1),
  endedAt: z.string().optional(),
  durationMinutes: z.string().optional(),
  tokensIn: z.string().optional(),
  tokensOut: z.string().optional(),
  linesAdded: z.string().optional(),
  linesRemoved: z.string().optional(),
  tool: z.string().optional(),
  model: z.string().optional(),
  projectSlug: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const mappingRaw = form.get("mapping");
  const defaultTool = (form.get("defaultTool") as Tool | null) ?? "MANUAL";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (typeof mappingRaw !== "string") {
    return NextResponse.json({ error: "missing mapping" }, { status: 400 });
  }
  let mapping;
  try {
    mapping = MappingSchema.parse(JSON.parse(mappingRaw));
  } catch (err: any) {
    return NextResponse.json({ error: "bad mapping", detail: String(err) }, { status: 400 });
  }

  const text = await file.text();
  const { sessions, warnings } = parseCsv(text, mapping, { defaultTool });

  if (sessions.length === 0) {
    return NextResponse.json({ received: 0, inserted: 0, warnings });
  }

  const result = await prisma.session.createMany({
    data: sessions.map((s) => ({
      userId: user.id,
      tool: s.tool,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationMs: s.durationMs,
      tokensIn: s.tokensIn,
      tokensOut: s.tokensOut,
      linesAdded: s.linesAdded,
      linesRemoved: s.linesRemoved,
      model: s.model,
      projectSlug: s.projectSlug,
    })),
    skipDuplicates: true,
  });
  await recomputeStreak(user.id);

  return NextResponse.json({
    received: sessions.length,
    inserted: result.count,
    skipped: sessions.length - result.count,
    warnings,
  });
}
