import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "tool", "startedAt", "endedAt", "durationMs",
  "tokensIn", "tokensInputRaw", "tokensCacheRead", "tokensCacheCreate", "tokensOut",
  "linesAdded", "linesRemoved", "model", "projectSlug",
] as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "asc" },
    select: {
      tool: true, startedAt: true, endedAt: true, durationMs: true,
      tokensIn: true, tokensInputRaw: true, tokensCacheRead: true,
      tokensCacheCreate: true, tokensOut: true,
      linesAdded: true, linesRemoved: true,
      model: true, projectSlug: true,
    },
  });

  const header = COLUMNS.join(",");
  const rows = sessions.map((s) =>
    COLUMNS.map((col) => {
      const v = s[col];
      if (v == null) return "";
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "string" && v.includes(",")) return `"${v}"`;
      return String(v);
    }).join(",")
  );

  const csv = [header, ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="devstats-${user.username}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
