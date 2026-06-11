import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, getUserFromApiKey } from "@/lib/auth";
import { joinSquad } from "@/lib/squads";

export const dynamic = "force-dynamic";

/** POST /api/squads/join — body { code }. Web session or CLI bearer key. */
export async function POST(req: Request) {
  const user = (await getUserFromApiKey(req)) ?? (await getCurrentUser());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let code: string;
  try {
    code = z.object({ code: z.string().min(4) }).parse(await req.json()).code;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  try {
    const squad = await joinSquad(user.id, code);
    return NextResponse.json({ joined: true, slug: squad.slug, name: squad.name });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
