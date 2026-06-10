import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RESERVED = new Set([
  "admin", "api", "auth", "dashboard", "leaderboard", "login", "logout",
  "settings", "privacy", "compare", "u", "og", "static", "_next", "favicon",
  "well-known", "robots", "sitemap", "error", "not-found",
]);

const BodySchema = z.object({
  username: z.string()
    .min(3, "min 3 chars")
    .max(24, "max 24 chars")
    .regex(/^[a-zA-Z0-9_-]+$/, "letters, digits, _ or - only"),
});

/** Change the authenticated user's username. Unique, length-bounded, reserved-list checked. */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err: any) {
    const msg = err?.errors?.[0]?.message ?? "invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const norm = body.username.toLowerCase();
  if (RESERVED.has(norm)) {
    return NextResponse.json({ error: "that handle is reserved" }, { status: 400 });
  }

  if (norm === user.username.toLowerCase() && body.username === user.username) {
    return NextResponse.json({ username: user.username, unchanged: true });
  }

  const taken = await prisma.user.findFirst({
    where: { username: { equals: body.username, mode: "insensitive" }, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken) return NextResponse.json({ error: "handle taken" }, { status: 409 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { username: body.username },
    select: { username: true },
  });

  return NextResponse.json(updated);
}
