import { NextResponse } from "next/server";
import { getCurrentUser, getUserFromApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Identity probe for the CLI. Supports either Supabase session or Bearer key. */
export async function GET(req: Request) {
  const user = (await getUserFromApiKey(req)) ?? (await getCurrentUser());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [sessionCount, tokenAgg] = await Promise.all([
    prisma.session.count({ where: { userId: user.id } }),
    prisma.session.aggregate({
      where: { userId: user.id },
      _sum: { tokensIn: true, tokensOut: true },
    }),
  ]);
  const lastSession = await prisma.session.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    isPublic: user.isPublic,
    sessions: sessionCount,
    tokensIn: tokenAgg._sum.tokensIn ?? 0,
    tokensOut: tokenAgg._sum.tokensOut ?? 0,
    lastSyncAt: lastSession?.createdAt.toISOString() ?? null,
  });
}
