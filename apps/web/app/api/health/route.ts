import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * Liveness + dependency probe. Used by uptime monitors post-deploy.
 * Returns 200 when Postgres answers; Redis is reported but non-fatal
 * (the app degrades gracefully without it).
 */
export async function GET() {
  const startedAt = Date.now();
  let db = false;
  let redis: boolean | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    /* db stays false */
  }

  const r = getRedis();
  if (r) {
    try {
      await r.ping();
      redis = true;
    } catch {
      redis = false;
    }
  }

  const ok = db; // Redis optional
  return NextResponse.json(
    {
      ok,
      db,
      redis, // null = not configured
      latencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
