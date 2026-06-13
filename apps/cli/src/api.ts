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
  let res: Response;
  try {
    res = await fetch(`${cfg.apiUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  } catch (e: any) {
    if (e.code === "ECONNREFUSED" || e.cause?.code === "ECONNREFUSED") {
      throw new Error(`Cannot connect to ${cfg.apiUrl} — is the server running?`);
    }
    if (e.code === "ENOTFOUND" || e.cause?.code === "ENOTFOUND") {
      throw new Error(`DNS lookup failed for ${cfg.apiUrl} — check your network or DEVSTATS_URL.`);
    }
    if (e.name === "TimeoutError" || e.code === "UND_ERR_CONNECT_TIMEOUT") {
      throw new Error(`Request to ${cfg.apiUrl} timed out — try again later.`);
    }
    throw new Error(`Network error: ${e.message}`);
  }
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = (body && body.error) || text || res.statusText;
    if (res.status === 401) throw new Error(`401: Invalid or expired API key. Re-run \`devstats login\`.`);
    if (res.status === 403) throw new Error(`403: Access denied. ${msg}`);
    if (res.status === 429) throw new Error(`429: Rate limited — wait a moment and retry.`);
    if (res.status >= 500) throw new Error(`${res.status}: Server error — try again later. (${msg})`);
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

// ── Squads ──────────────────────────────────────────────────
export interface SquadSummary {
  slug: string;
  name: string;
  memberCount: number;
  inviteCode: string;
  isCreator: boolean;
}

export const squadList = (cfg: CliConfig) =>
  req<{ squads: SquadSummary[] }>(cfg, "/api/squads");

export const squadCreate = (cfg: CliConfig, name: string) =>
  req<{ slug: string; name: string; inviteCode: string }>(cfg, "/api/squads", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const squadJoin = (cfg: CliConfig, code: string) =>
  req<{ joined: boolean; slug: string; name: string }>(cfg, "/api/squads/join", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

export const squadLeave = (cfg: CliConfig, slug: string) =>
  req<{ left: boolean }>(cfg, `/api/squads/${encodeURIComponent(slug)}`, { method: "DELETE" });

export const squadStandings = (
  cfg: CliConfig,
  slug: string,
  period: string,
  metric: string,
) =>
  req<{
    squad: { name: string; slug: string; inviteCode: string; memberCount: number };
    rows: { rank: number; username: string; countryCode: string | null; score: number; tools: string[] }[];
    period: string;
    metric: string;
  }>(cfg, `/api/squads/${encodeURIComponent(slug)}?period=${period}&metric=${metric}`);
