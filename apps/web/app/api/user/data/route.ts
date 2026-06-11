import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recomputeStreak } from "@/lib/stats";

export const dynamic = "force-dynamic";

const TOOLS = ["CLAUDE_CODE", "CURSOR", "ANTIGRAVITY", "WINDSURF", "COPILOT", "MANUAL"];

/**
 * Delete all sessions from one tool (?tool=ANTIGRAVITY) or everything
 * (?tool=ALL). Useful when a parser misread data and the user wants a clean
 * reimport without nuking the whole account.
 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const tool = (url.searchParams.get("tool") ?? "").toUpperCase();

  if (tool !== "ALL" && !TOOLS.includes(tool)) {
    return NextResponse.json(
      { error: `tool must be one of ${TOOLS.join(", ")} or ALL` },
      { status: 400 },
    );
  }

  const result = await prisma.session.deleteMany({
    where: { userId: user.id, ...(tool === "ALL" ? {} : { tool }) },
  });

  await recomputeStreak(user.id);

  return NextResponse.json({ deleted: result.count, tool });
}
