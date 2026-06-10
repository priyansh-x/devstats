import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Follow / unfollow another user. POST to add, DELETE to remove. Always
 * authoritative: returns the new follow state so the client doesn't need to
 * re-fetch.
 */
export async function POST(_req: Request, { params }: { params: { username: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const target = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true, isPublic: true },
  });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (target.id === me.id) {
    return NextResponse.json({ error: "can't follow yourself" }, { status: 400 });
  }
  if (!target.isPublic) {
    return NextResponse.json({ error: "user is private" }, { status: 403 });
  }

  await prisma.friendship.upsert({
    where: { followerId_followedId: { followerId: me.id, followedId: target.id } },
    update: {},
    create: { followerId: me.id, followedId: target.id },
  });

  return NextResponse.json({ following: true });
}

export async function DELETE(_req: Request, { params }: { params: { username: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const target = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.friendship.deleteMany({
    where: { followerId: me.id, followedId: target.id },
  });
  return NextResponse.json({ following: false });
}

/** Is the current user following `username`? Also reports follower/following counts. */
export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const me = await getCurrentUser();
  const target = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [following, followers] = await Promise.all([
    prisma.friendship.count({ where: { followedId: target.id } }),
    prisma.friendship.count({ where: { followerId: target.id } }),
  ]);
  let isFollowing = false;
  if (me && me.id !== target.id) {
    const edge = await prisma.friendship.findUnique({
      where: { followerId_followedId: { followerId: me.id, followedId: target.id } },
      select: { id: true },
    });
    isFollowing = !!edge;
  }
  return NextResponse.json({ followers: following, following: followers, isFollowing });
}
