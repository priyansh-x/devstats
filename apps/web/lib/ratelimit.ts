import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

/**
 * Sliding-window rate limiters per scope. No-op (always allow) when Upstash
 * isn't configured locally — production deployments must have the env vars.
 *
 * Identifiers should be user IDs when authenticated, IP fallback otherwise.
 */
type Scope = "upload" | "uploadFile" | "og" | "leaderboard" | "publicProfile" | "follow";

const LIMITS: Record<Scope, { tokens: number; window: `${number} ${"s" | "m" | "h" | "d"}` }> = {
  upload:        { tokens: 60,  window: "1 m" },   // CLI sync — 60 batches/min/user
  uploadFile:    { tokens: 20,  window: "1 h" },   // CSV upload — 20/hour/user
  og:            { tokens: 30,  window: "1 m" },   // OG image — 30/min/ip
  leaderboard:   { tokens: 120, window: "1 m" },   // GET /api/leaderboard
  publicProfile: { tokens: 60,  window: "1 m" },   // /u/[username] page
  follow:        { tokens: 30,  window: "1 h" },   // follow/unfollow — anti-spam
};

const cache: Partial<Record<Scope, Ratelimit | null>> = {};

function get(scope: Scope): Ratelimit | null {
  if (cache[scope] !== undefined) return cache[scope]!;
  const redis = getRedis();
  if (!redis) {
    cache[scope] = null;
    return null;
  }
  const { tokens, window } = LIMITS[scope];
  cache[scope] = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: `rl:${scope}`,
    analytics: false,
  });
  return cache[scope]!;
}

export interface RatelimitResult {
  ok: boolean;
  remaining: number;
  reset: number;
  retryAfterSeconds: number;
}

export async function ratelimit(
  scope: Scope,
  identifier: string,
): Promise<RatelimitResult> {
  const rl = get(scope);
  if (!rl) return { ok: true, remaining: 1, reset: 0, retryAfterSeconds: 0 };
  const r = await rl.limit(identifier);
  return {
    ok: r.success,
    remaining: r.remaining,
    reset: r.reset,
    retryAfterSeconds: Math.max(0, Math.ceil((r.reset - Date.now()) / 1000)),
  };
}

/** Resolve a client identifier from a request — user if present, IP fallback. */
export function ipFrom(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
