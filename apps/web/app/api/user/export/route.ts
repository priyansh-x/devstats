import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Full data export, as promised on /privacy. Returns everything we hold about
 * the authenticated user as a downloadable JSON file: profile fields, every
 * session row, streak state, and the follow graph (handles only).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [sessions, streak, following, followers] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "asc" },
      select: {
        tool: true, startedAt: true, endedAt: true, durationMs: true,
        tokensIn: true, tokensInputRaw: true, tokensCacheRead: true,
        tokensCacheCreate: true, tokensOut: true,
        linesAdded: true, linesRemoved: true,
        model: true, projectSlug: true, createdAt: true,
      },
    }),
    prisma.streak.findUnique({ where: { userId: user.id } }),
    prisma.friendship.findMany({
      where: { followerId: user.id },
      select: { followed: { select: { username: true } }, createdAt: true },
    }),
    prisma.friendship.findMany({
      where: { followedId: user.id },
      select: { follower: { select: { username: true } }, createdAt: true },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: {
      username: user.username,
      email: user.email,
      bio: user.bio,
      location: user.location,
      countryCode: user.countryCode,
      isPublic: user.isPublic,
      createdAt: user.createdAt,
    },
    streak: streak
      ? { current: streak.currentStreak, longest: streak.longestStreak, lastActiveDate: streak.lastActiveDate }
      : null,
    following: following.map((f) => ({ username: f.followed.username, since: f.createdAt })),
    followers: followers.map((f) => ({ username: f.follower.username, since: f.createdAt })),
    sessions,
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="devstats-export-${user.username}-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
