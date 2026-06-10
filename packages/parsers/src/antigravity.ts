import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { stat, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import type { NormalisedSession, ParseResult } from "@devstats/types";
import { hashProjectName } from "./utils";

export interface AntigravityParseOptions {
  /** Override path to Antigravity's global state.vscdb (otherwise OS-detected). */
  dbPath?: string;
  /** Only emit conversations whose timestamp is at/after this epoch-ms. */
  sinceMs?: number;
  /**
   * Override the activity window [loMs, hiMs] used to spread conversations.
   * Normally derived from the mtimes of the workspaceStorage folders. Exposed
   * for tests.
   */
  activityWindow?: { loMs: number; hiMs: number };
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
 * NormalisedSession per distinct conversation ID, with an *activity proxy*
 * durationMs derived from the step count. Tokens are intentionally left
 * undefined so cost estimates don't pretend to know what they don't.
 *
 * Timestamps: the notification keys carry no time of their own. Naively
 * anchoring every conversation to the DB file's mtime (the previous behaviour)
 * had two bad effects:
 *   • the heatmap showed a user's entire Antigravity history as a single spike
 *     on whatever day the DB was last written, and
 *   • because the anchor moved every time Antigravity rewrote its DB, re-syncs
 *     re-dated every conversation and uploaded them again as fresh rows
 *     (the dedupe key is (tool, startedAt)).
 *
 * Instead we now:
 *   1. Derive the real *activity window* [lo, hi] from the mtimes of the
 *      per-workspace storage folders — these span the actual months the user
 *      has used Antigravity.
 *   2. Place each conversation deterministically inside that window via a hash
 *      of its conversation ID. Same conversation → same startedAt on every run
 *      (stable dedupe), and the set spreads across the days activity really
 *      happened instead of collapsing onto one. This is explicitly an
 *      approximation — we surface presence/recency, not exact message times.
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

    // Establish the real activity window from the workspace-storage mtimes,
    // then place each conversation deterministically inside it (see header).
    const window =
      opts.activityWindow ?? (await deriveActivityWindow(dbPath, dbStat.mtimeMs));
    const sorted = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const hasWindow = window.hiMs > window.loMs;

    let i = 0;
    for (const [cid, b] of sorted) {
      const startedAt = hasWindow
        ? new Date(window.loMs + fractionFor(cid) * (window.hiMs - window.loMs))
        : // Degenerate window (couldn't read workspace mtimes): fall back to
          // distinct, stable offsets back from the single anchor instant.
          new Date(window.hiMs - (sorted.length - i) * 1000);
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

/**
 * Map a conversation ID to a stable fraction in [0, 1) via its SHA-256. Used to
 * place the conversation inside the activity window deterministically — the
 * same ID always lands at the same spot, so re-syncs dedupe cleanly.
 */
function fractionFor(cid: string): number {
  const h = createHash("sha256").update(cid).digest();
  // Top 6 bytes give plenty of resolution without BigInt.
  const n = h.readUIntBE(0, 6);
  return n / 2 ** 48;
}

/**
 * Derive the [lo, hi] activity window from the mtimes of the per-workspace
 * storage folders that sit alongside globalStorage. These span the actual span
 * of Antigravity usage. Falls back to a single-instant window at `anchorMs`
 * (the global DB mtime) when the folders can't be read.
 */
async function deriveActivityWindow(
  dbPath: string,
  anchorMs: number,
): Promise<{ loMs: number; hiMs: number }> {
  // dbPath = …/User/globalStorage/state.vscdb  →  …/User/workspaceStorage
  const userDir = dirname(dirname(dbPath));
  const wsDir = join(userDir, "workspaceStorage");
  const mtimes: number[] = [];
  try {
    const entries = await readdir(wsDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      try {
        const st = await stat(join(wsDir, e.name));
        if (st.mtimeMs > 0) mtimes.push(st.mtimeMs);
      } catch {
        /* skip unreadable workspace */
      }
    }
  } catch {
    /* no workspaceStorage — fall through to single-instant window */
  }
  if (mtimes.length === 0) return { loMs: anchorMs, hiMs: anchorMs };
  return { loMs: Math.min(...mtimes), hiMs: Math.max(...mtimes, anchorMs) };
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
