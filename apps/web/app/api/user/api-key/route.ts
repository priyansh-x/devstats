import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getCurrentUser, hashApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Generates a new API key for the current user and stores only its SHA-256
 * hash. The plaintext is returned ONCE — there is no way to retrieve it later.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ds_live_<32-byte base64url> — recognizable prefix, ~256 bits entropy.
  const raw = "ds_live_" + randomBytes(24).toString("base64url");
  const hash = hashApiKey(raw);

  const issuedAt = new Date();
  await prisma.user.update({
    where: { id: user.id },
    // Rotation resets last-used — the old key's history dies with it.
    data: { apiKeyHash: hash, apiKeyIssuedAt: issuedAt, apiKeyLastUsedAt: null },
  });

  return NextResponse.json({
    apiKey: raw,
    issuedAt: issuedAt.toISOString(),
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    hasKey: !!user.apiKeyHash,
    issuedAt: user.apiKeyIssuedAt?.toISOString() ?? null,
    lastUsedAt: user.apiKeyLastUsedAt?.toISOString() ?? null,
  });
}
