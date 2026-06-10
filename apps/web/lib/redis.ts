import { Redis } from "@upstash/redis";

/**
 * Upstash Redis singleton. Used for leaderboard caching, rate limits,
 * and the session pre-computation TTLs. Returns null if env not configured
 * so callers can degrade to direct DB queries.
 */
let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}
