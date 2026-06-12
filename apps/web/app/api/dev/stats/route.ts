import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  if (!process.env.ADMIN_PASSWORD || pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const dayAgo = new Date(now.getTime() - 86400000);

  const [
    totalUsers,
    publicUsers,
    totalSessions,
    sessionsLastWeek,
    sessionsLastDay,
    totalSquads,
    usersByTool,
    activeUsersWeek,
    activeUsersDay,
    recentSessions,
    topUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isPublic: true } }),
    prisma.session.count(),
    prisma.session.count({ where: { startedAt: { gte: weekAgo } } }),
    prisma.session.count({ where: { startedAt: { gte: dayAgo } } }),
    prisma.squad.count(),
    prisma.$queryRaw`
      SELECT tool, COUNT(DISTINCT "userId") as users, COUNT(*) as sessions,
             COALESCE(SUM("tokensIn"),0) + COALESCE(SUM("tokensOut"),0) as tokens
      FROM "Session" GROUP BY tool ORDER BY sessions DESC
    ` as Promise<{ tool: string; users: bigint; sessions: bigint; tokens: bigint }[]>,
    prisma.session
      .groupBy({ by: ["userId"], where: { startedAt: { gte: weekAgo } } })
      .then((r) => r.length),
    prisma.session
      .groupBy({ by: ["userId"], where: { startedAt: { gte: dayAgo } } })
      .then((r) => r.length),
    prisma.session.findMany({
      take: 20,
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        tool: true,
        startedAt: true,
        tokensIn: true,
        tokensOut: true,
        model: true,
        user: { select: { username: true } },
      },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { sessions: { _count: "desc" } },
      select: {
        username: true,
        isPublic: true,
        createdAt: true,
        _count: { select: { sessions: true } },
      },
    }),
  ]);

  return NextResponse.json({
    overview: {
      totalUsers,
      publicUsers,
      totalSessions,
      sessionsLastWeek,
      sessionsLastDay,
      totalSquads,
      activeUsersWeek,
      activeUsersDay,
    },
    byTool: usersByTool.map((r) => ({
      tool: r.tool,
      users: Number(r.users),
      sessions: Number(r.sessions),
      tokens: Number(r.tokens),
    })),
    topUsers: topUsers.map((u) => ({
      username: u.username,
      isPublic: u.isPublic,
      createdAt: u.createdAt,
      sessions: u._count.sessions,
    })),
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      user: s.user.username,
      tool: s.tool,
      startedAt: s.startedAt,
      tokensIn: s.tokensIn,
      tokensOut: s.tokensOut,
      model: s.model,
    })),
  });
}
