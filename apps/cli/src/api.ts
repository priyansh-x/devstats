import type { NormalisedSession } from "@devstats/types";
import type { CliConfig } from "./config.js";

export interface WhoamiResponse {
  id: string;
  username: string;
  email: string;
  isPublic: boolean;
  sessions: number;
  tokensIn: number;
  tokensOut: number;
  lastSyncAt: string | null;
}

export interface UploadResponse {
  received: number;
  inserted: number;
  skipped: number;
}

async function req<T>(cfg: CliConfig, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${cfg.apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = (body && body.error) || text || res.statusText;
    throw new Error(`${res.status}: ${msg}`);
  }
  return body as T;
}

export const whoami = (cfg: CliConfig) => req<WhoamiResponse>(cfg, "/api/user/me");

export const upload = (cfg: CliConfig, sessions: NormalisedSession[]) =>
  req<UploadResponse>(cfg, "/api/sessions/upload", {
    method: "POST",
    body: JSON.stringify({ sessions }),
  });

export interface LbRow {
  rank: number;
  username: string;
  score: number;
  tools: string[];
}
export interface LeaderboardResponse {
  period: string;
  metric: string;
  rows: LbRow[];
}
export const leaderboard = (
  cfg: CliConfig,
  period: "daily" | "weekly" | "monthly" | "alltime",
  metric: "tokens" | "sessions" | "duration" | "lines",
) =>
  req<LeaderboardResponse>(
    cfg,
    `/api/leaderboard?period=${period}&metric=${metric}`,
  );

export interface PublicProfileResponse {
  username: string;
  createdAt: string;
  stats: {
    totals: {
      tokensIn: number;
      tokensOut: number;
      sessions: number;
      durationMs: number;
      activeDays: number;
      tokensCacheRead: number;
    };
    streak: { current: number; longest: number };
    toolBreakdown: { tool: string; sessions: number; tokens: number }[];
    topModels: { model: string; sessions: number; tokens: number }[];
  };
}

/** Public profile endpoint — only succeeds for public users. */
export const publicProfile = (cfg: CliConfig, username: string) =>
  req<PublicProfileResponse>(cfg, `/api/stats/${encodeURIComponent(username)}`);
