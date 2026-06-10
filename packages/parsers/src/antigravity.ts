import { homedir } from "node:os";
import { join } from "node:path";
import { stat } from "node:fs/promises";
import Database from "better-sqlite3";
import type { NormalisedSession, ParseResult } from "@devstats/types";
import { hashProjectName } from "./utils";

export interface AntigravityParseOptions {
  /** Override path to Antigravity's global state.vscdb (otherwise OS-detected). */
  dbPath?: string;
  /** Only emit conversations whose timestamp is at/after this epoch-ms. */
  sinceMs?: number;
}

/**
 * Parses Google Antigravity's local state.
 *
 * Caveat: Antigravity stores chat transcripts and per-message token counts
 * on Google's servers, not locally. The on-disk SQLite only carries:
 *   • `antigravity.notification.<conversationId>-<step>` keys (booleans —
 *     unread flags), which let us enumerate distinct conversation IDs
 *     and approximate their length from the highest step number.
 *   • Workspace and IDE state — no message bodies.
 *
 * Until Google ships a usage-export API, the best we can do is emit one
 * NormalisedSession per distinct conversation ID, with timestamp anchored to
 * the DB file's mtime and an *activity proxy* durationMs derived from the
 * step count. Tokens are intentionally left undefined so cost estimates
 * don't pretend to know what they don't.
 *
 * This is honest "presence" telemetry — enough for streaks and tool-mix
 * breakdowns, but the leaderboard's TOKENS metric won't reward you for
 * Antigravity use until the upstream exposes counts.
 */
export async function parseAntigravity(
  opts: AntigravityParseOptions = {},
): Promise<ParseResult> {
  const warnings: string[] = [];
  const sessions: NormalisedSession[] = [];

  const dbPath = opts.dbPath ?? defaultDbPath();
  let dbStat;
  try {
    dbStat = await stat(dbPath);
    if (!dbStat.isFile()) {
      warnings.push(`antigravity: ${dbPath} is not a file`);
      return { sessions, warnings };
    }
  } catch {
    // Antigravity not installed — silent return.
    return { sessions, warnings };
  }

  let db: Database.Database;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
  } catch (err: any) {
    warnings.push(`antigravity: cannot open db: ${err.message}`);
    return { sessions, warnings };
  }

  try {
    // Group notification keys by conversation ID and track the highest step.
    // Key shape: antigravity.notification.<uuid>-<integer>
    const buckets = new Map<string, { steps: number; max: number }>();
    const rows = db
      .prepare("SELECT key FROM ItemTable WHERE key LIKE 'antigravity.notification.%'")
      .all() as { key: string }[];
    for (const r of rows) {
      const tail = r.key.slice("antigravity.notification.".length);
      const sep = tail.lastIndexOf("-");
      if (sep < 0) continue;
      const cid = tail.slice(0, sep);
      const stepRaw = tail.slice(sep + 1);
      const step = Number.parseInt(stepRaw, 10);
      if (!cid || !Number.isFinite(step)) continue;
      const b = buckets.get(cid) ?? { steps: 0, max: 0 };
      b.steps += 1;
      if (step > b.max) b.max = step;
      buckets.set(cid, b);
    }

    if (buckets.size === 0) {
      // Nothing to emit — Antigravity is installed but hasn't accumulated
      // any conversation telemetry yet.
      return { sessions, warnings };
    }

    // We have no per-conversation timestamps. Anchor everything to the DB's
    // last-modified time so dedupe (`@@unique([userId, tool, startedAt])`)
    // remains stable across re-runs, and spread the conversation IDs by a
    // 1ms offset so they don't all collide on the exact same instant.
    const baseMs = dbStat.mtimeMs;
    const sorted = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    let i = 0;
    for (const [cid, b] of sorted) {
      const startedAt = new Date(baseMs - (sorted.length - i) * 1000);
      i++;
      if (opts.sinceMs && startedAt.getTime() < opts.sinceMs) continue;

      // Step number is a rough activity proxy: each step is one agent action
      // (~10s of work). Cap at 2h to keep outliers sane.
      const durationMs = Math.min(
        2 * 60 * 60 * 1000,
        Math.max(60_000, b.max * 10_000),
      );

      sessions.push({
        tool: "ANTIGRAVITY",
        startedAt,
        endedAt: new Date(startedAt.getTime() + durationMs),
        durationMs,
        // tokens intentionally undefined — see file header.
        model: "antigravity/agent",
        projectSlug: hashProjectName(cid),
      });
    }
  } catch (err: any) {
    warnings.push(`antigravity: query failed: ${err.message}`);
  } finally {
    db.close();
  }

  sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return { sessions, warnings };
}

function defaultDbPath(): string {
  const plat = process.platform;
  if (plat === "darwin") {
    return join(
      homedir(),
      "Library/Application Support/Antigravity/User/globalStorage/state.vscdb",
    );
  }
  if (plat === "win32") {
    return join(
      process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
      "Antigravity/User/globalStorage/state.vscdb",
    );
  }
  return join(homedir(), ".config/Antigravity/User/globalStorage/state.vscdb");
}
