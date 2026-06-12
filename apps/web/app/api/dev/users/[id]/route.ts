import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return process.env.ADMIN_PASSWORD && pw === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      streak: true,
      squadMemberships: { include: { squad: { select: { name: true, slug: true } } } },
      _count: { select: { sessions: true, following: true, followers: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [toolBreakdown, recentSessions, modelBreakdown, dailyActivity] = await Promise.all([
    prisma.$queryRaw`
      SELECT tool, COUNT(*)::int as sessions,
             COALESCE(SUM("tokensIn"),0)::bigint as "tokensIn",
             COALESCE(SUM("tokensOut"),0)::bigint as "tokensOut",
             COALESCE(SUM("durationMs"),0)::bigint as "durationMs"
      FROM "Session" WHERE "userId" = ${params.id}
      GROUP BY tool ORDER BY sessions DESC
    ` as Promise<any[]>,
    prisma.session.findMany({
      where: { userId: params.id },
      take: 30,
      orderBy: { startedAt: "desc" },
      select: {
        id: true, tool: true, model: true, startedAt: true, endedAt: true,
        tokensIn: true, tokensOut: true, durationMs: true, projectSlug: true,
      },
    }),
    prisma.$queryRaw`
      SELECT model, COUNT(*)::int as sessions,
             COALESCE(SUM("tokensIn"),0)::bigint + COALESCE(SUM("tokensOut"),0)::bigint as tokens
      FROM "Session" WHERE "userId" = ${params.id} AND model IS NOT NULL
      GROUP BY model ORDER BY tokens DESC LIMIT 10
    ` as Promise<any[]>,
    prisma.$queryRaw`
      SELECT DATE("startedAt") as date, COUNT(*)::int as sessions,
             COALESCE(SUM("tokensIn"),0)::bigint + COALESCE(SUM("tokensOut"),0)::bigint as tokens
      FROM "Session" WHERE "userId" = ${params.id}
      GROUP BY DATE("startedAt") ORDER BY date DESC LIMIT 30
    ` as Promise<any[]>,
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      countryCode: user.countryCode,
      isPublic: user.isPublic,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      apiKeyIssuedAt: user.apiKeyIssuedAt,
      apiKeyLastUsedAt: user.apiKeyLastUsedAt,
      sessions: user._count.sessions,
      following: user._count.following,
      followers: user._count.followers,
      streak: user.streak,
      squads: user.squadMemberships.map((m) => m.squad),
    },
    toolBreakdown: toolBreakdown.map((t: any) => ({
      ...t,
      tokensIn: Number(t.tokensIn),
      tokensOut: Number(t.tokensOut),
      durationMs: Number(t.durationMs),
    })),
    modelBreakdown: modelBreakdown.map((m: any) => ({ ...m, tokens: Number(m.tokens) })),
    recentSessions,
    dailyActivity: dailyActivity.map((d: any) => ({
      date: d.date,
      sessions: d.sessions,
      tokens: Number(d.tokens),
    })),
  });
}
