import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, getUserFromApiKey } from "@/lib/auth";
import { createSquad, mySquads } from "@/lib/squads";

export const dynamic = "force-dynamic";

/** GET /api/squads — list my squads. Works for web session AND CLI bearer key. */
export async function GET(req: Request) {
  const user = (await getUserFromApiKey(req)) ?? (await getCurrentUser());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ squads: await mySquads(user.id) });
}

/** POST /api/squads — create one. Body: { name }. */
export async function POST(req: Request) {
  const user = (await getUserFromApiKey(req)) ?? (await getCurrentUser());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let name: string;
  try {
    name = z.object({ name: z.string() }).parse(await req.json()).name;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  try {
    const squad = await createSquad(user.id, name);
    return NextResponse.json({ slug: squad.slug, name: squad.name, inviteCode: squad.inviteCode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
