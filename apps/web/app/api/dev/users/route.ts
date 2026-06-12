import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return process.env.ADMIN_PASSWORD && pw === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = 25;
  const skip = (page - 1) * limit;

  const where = q
    ? {
        OR: [
          { username: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { location: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        location: true,
        countryCode: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        apiKeyIssuedAt: true,
        apiKeyLastUsedAt: true,
        _count: { select: { sessions: true, following: true, followers: true, squadMemberships: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      sessions: u._count.sessions,
      following: u._count.following,
      followers: u._count.followers,
      squads: u._count.squadMemberships,
      _count: undefined,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
