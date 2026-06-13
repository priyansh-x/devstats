import { homedir } from "node:os";
import { join } from "node:path";
import { stat } from "node:fs/promises";
import Database from "better-sqlite3";
import type { NormalisedSession, ParseResult } from "@devstats/types";

export interface CursorParseOptions {
  /** Override path to Cursor's state.vscdb (otherwise OS-detected). */
  dbPath?: string;
  /** Only emit composers whose createdAt is at/after this epoch-ms. */
  sinceMs?: number;
}

/**
 * Parses Cursor's local SQLite chat history.
 *
 * Data model (as of Cursor 0.x, 2025-06):
 *   • `composerData:<composerId>`  — one row per chat/conversation. Has
 *     `createdAt`, `lastUpdatedAt`, `isAgentic`, `unifiedMode`, etc.
 *   • `bubbleId:<composerId>:<bubbleId>` — one row per message. Has
 *     `tokenCount: {inputTokens, outputTokens}` on assistant bubbles.
 *
 * One NormalisedSession is emitted per composer (the natural session boundary
 * in Cursor), with tokens summed from the matching bubbles. Composers with no
 * tokens or no timestamp are skipped.
 *
 * Bubbles carry no timestamps of their own, so intra-composer gap-splitting
 * (like Claude Code) isn't possible — but composer-level aggregation gives
 * stable, dedupe-safe startedAt values.
 */
export async function parseCursor(
  opts: CursorParseOptions = {},
): Promise<ParseResult> {
  const warnings: string[] = [];
  const sessions: NormalisedSession[] = [];

  const dbPath = opts.dbPath ?? defaultDbPath();
  try {
    const s = await stat(dbPath);
    if (!s.isFile()) {
      warnings.push(`cursor: ${dbPath} is not a file`);
      return { sessions, warnings };
    }
  } catch {
    // Cursor not installed (or never run) — silent return is the right call.
    return { sessions, warnings };
  }

  let db: Database.Database;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
  } catch (err: any) {
    warnings.push(`cursor: cannot open db: ${err.message}`);
    return { sessions, warnings };
  }

  try {
    // 1) Bubble tokens grouped by composerId. Done at the SQLite layer to
    //    avoid loading every bubble blob into JS just to sum a couple of ints.
    const bubbleAgg = new Map<
      string,
      { tokensIn: number; tokensOut: number; bubbles: number; model?: string }
    >();
    const bubbleRows = db
      .prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'")
      .all() as { key: string; value: Buffer | string }[];

    for (const r of bubbleRows) {
      const composerId = r.key.split(":")[1];
      if (!composerId) continue;
      const obj = parseJson(r.value);
      if (!obj) continue;
      const tc = obj.tokenCount;
      if (!tc) continue;
      const tin = num(tc.inputTokens);
      const tout = num(tc.outputTokens);
      if (tin === 0 && tout === 0) continue;

      const a = bubbleAgg.get(composerId) ?? { tokensIn: 0, tokensOut: 0, bubbles: 0 };
      a.tokensIn += tin;
      a.tokensOut += tout;
      a.bubbles += 1;
      if (!a.model) a.model = bubbleModel(obj);
      bubbleAgg.set(composerId, a);
    }

    // 2) Composers — one session each, dated by createdAt.
    const composerRows = db
      .prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
      .all() as { key: string; value: Buffer | string }[];

    for (const r of composerRows) {
      const obj = parseJson(r.value);
      if (!obj) continue;
      const composerId: string | undefined = obj.composerId ?? r.key.split(":")[1];
      if (!composerId) continue;

      const createdAt = num(obj.createdAt);
      if (!createdAt) continue; // can't safely dedupe without a real timestamp
      if (opts.sinceMs && createdAt < opts.sinceMs) continue;

      const lastAt = num(obj.lastUpdatedAt) || createdAt;
      const agg = bubbleAgg.get(composerId);
      if (!agg || (agg.tokensIn === 0 && agg.tokensOut === 0)) continue;

      sessions.push({
        tool: "CURSOR",
        startedAt: new Date(createdAt),
        endedAt: new Date(Math.max(lastAt, createdAt)),
        durationMs: Math.max(0, lastAt - createdAt),
        tokensIn: agg.tokensIn || undefined,
        // Cursor doesn't separate raw vs cache — treat it all as fresh input
        // so the cost calc doesn't free-ride on Anthropic's cache discount.
        tokensInputRaw: agg.tokensIn || undefined,
        tokensOut: agg.tokensOut || undefined,
        model: agg.model ?? deriveModel(obj),
      });
    }
  } catch (err: any) {
    warnings.push(`cursor: query failed: ${err.message}`);
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
      "Library/Application Support/Cursor/User/globalStorage/state.vscdb",
    );
  }
  if (plat === "win32") {
    return join(
      process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
      "Cursor/User/globalStorage/state.vscdb",
    );
  }
  return join(homedir(), ".config/Cursor/User/globalStorage/state.vscdb");
}

function parseJson(v: Buffer | string): any | null {
  try {
    return JSON.parse(typeof v === "string" ? v : v.toString("utf8"));
  } catch {
    return null;
  }
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// Cursor uses numeric IDs for unifiedMode in newer versions
const MODE_NAMES: Record<number | string, string> = {
  1: "agent", 2: "agent", 3: "ask",
  "chat": "chat", "agent": "agent", "edit": "edit", "ask": "ask",
};

function resolveMode(v: unknown): string | undefined {
  if (v == null) return undefined;
  return MODE_NAMES[v as number | string] ?? (typeof v === "string" ? v : undefined);
}

function bubbleModel(obj: any): string | undefined {
  if (typeof obj.modelType === "string" && obj.modelType) return obj.modelType;
  if (typeof obj.modelId === "string" && obj.modelId) return obj.modelId;
  if (typeof obj.model === "string" && obj.model) return obj.model;
  const mode = resolveMode(obj.unifiedMode);
  if (mode) return `cursor/${mode}`;
  if (obj.isAgentic === true) return "cursor/agent";
  return undefined;
}

function deriveModel(composer: any): string | undefined {
  const mode = resolveMode(composer.unifiedMode) ?? resolveMode(composer.forceMode);
  if (mode) return `cursor/${mode}`;
  if (composer.isAgentic === true) return "cursor/agent";
  return undefined;
}
