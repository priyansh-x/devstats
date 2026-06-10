import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const BodySchema = z.object({
  isPublic: z.boolean(),
  consent: z.boolean(),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err: any) {
    return NextResponse.json({ error: "invalid body", detail: String(err) }, { status: 400 });
  }

  // Going public requires explicit consent every time the toggle flips on.
  if (body.isPublic && !body.consent) {
    return NextResponse.json(
      { error: "consent required to go public" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isPublic: body.isPublic },
  });

  // Toggling private wipes leaderboard entries immediately so the user
  // disappears from rankings before the next cron refresh.
  if (!body.isPublic) {
    await prisma.leaderboardEntry.deleteMany({ where: { userId: user.id } });
  }

  return NextResponse.json({ isPublic: body.isPublic });
}
