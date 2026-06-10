import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  bio:      z.string().max(160).nullable().optional(),
  location: z.string().max(80).nullable().optional(),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
    },
    select: { bio: true, location: true },
  });
  return NextResponse.json(updated);
}
