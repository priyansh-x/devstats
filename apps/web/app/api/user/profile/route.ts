import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCountryCode } from "@/lib/countries";

const BodySchema = z.object({
  bio:         z.string().max(160).nullable().optional(),
  location:    z.string().max(80).nullable().optional(),
  countryCode: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Country code: empty → clear, present → must be in our list (case-insensitive).
  let cc: string | null | undefined = undefined;
  if (body.countryCode !== undefined) {
    if (!body.countryCode) cc = null;
    else if (!isCountryCode(body.countryCode)) {
      return NextResponse.json({ error: "unknown country code" }, { status: 400 });
    } else {
      cc = body.countryCode.toUpperCase();
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.bio      !== undefined ? { bio: body.bio } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(cc            !== undefined ? { countryCode: cc } : {}),
    },
    select: { bio: true, location: true, countryCode: true },
  });
  return NextResponse.json(updated);
}
