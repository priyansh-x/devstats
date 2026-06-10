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
