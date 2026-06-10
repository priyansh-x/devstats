import { homedir } from "node:os";
import { join } from "node:path";
import { stat } from "node:fs/promises";
import Database from "better-sqlite3";
import type { NormalisedSession, ParseResult } from "@devstats/types";

export interface WindsurfParseOptions {
  /** Override path to Windsurf's global state.vscdb (otherwise OS-detected). */
  dbPath?: string;
  /** Only emit conversations whose createdAt is at/after this epoch-ms. */
  sinceMs?: number;
}

/**
 * Parses Windsurf's (Codeium) local SQLite chat/Cascade history.
 *
 * Windsurf is a VS Code fork, so — like Cursor — it persists agent state in a
 * key/value SQLite at `…/Windsurf/User/globalStorage/state.vscdb`. Two storage
 * layouts exist in the wild and we handle both:
 *
 *   1. `cursorDiskKV` table (newer "Cascade"/Composer layout, Cursor-compatible):
 *        • `composerData:<id>` / `cascadeData:<id>` / `agentData:<id>` /
 *          `flowData:<id>` — one row per conversation, carrying `createdAt`,
 *          `lastUpdatedAt`, and either an inline `conversation[]` array or a
 *          pointer to separate `bubbleId:<composer>:<bubble>` message rows.
 *        • `bubbleId:<composer>:<bubble>` — one message each, with token
 *          counts on assistant bubbles.
 *
 *   2. `ItemTable` (older single-blob chat layout):
 *        • `cascade.chatdata` / `aiChat.chatdata` / `chat.data` /
 *          `workbench.panel.aichat.view.aichat.chatdata` — a single JSON blob
 *          holding every chat/tab, each with a `bubbles[]` array.
 *
 * One NormalisedSession is emitted per conversation. Token counts are read
 * defensively from the several shapes Windsurf/Codeium have shipped
 * (`tokenCount.{inputTokens,outputTokens}`, `usage.{input_tokens,output_tokens}`,
 * `tokens.{input,output}`, `numInputTokens`/`numOutputTokens`). Conversations
 * with no usable timestamp are skipped so dedupe stays stable.
 */
export async function parseWindsurf(
  opts: WindsurfParseOptions = {},
): Promise<ParseResult> {
  const warnings: string[] = [];
  const sessions: NormalisedSession[] = [];

  const dbPath = opts.dbPath ?? defaultDbPath();
  try {
    const s = await stat(dbPath);
    if (!s.isFile()) {
      warnings.push(`windsurf: ${dbPath} is not a file`);
      return { sessions, warnings };
    }
  } catch {
    // Windsurf not installed (or never run) — silent return is the right call.
    return { sessions, warnings };
  }

  let db: Database.Database;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
  } catch (err: any) {
    warnings.push(`windsurf: cannot open db: ${err.message}`);
    return { sessions, warnings };
  }

  try {
    const tables = new Set(
      (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[])
        .map((r) => r.name),
    );

    if (tables.has("cursorDiskKV")) {
      collectFromDiskKV(db, opts, sessions);
    }
    if (tables.has("ItemTable")) {
      collectFromItemTable(db, opts, sessions);
    }
    if (!tables.has("cursorDiskKV") && !tables.has("ItemTable")) {
      warnings.push("windsurf: unexpected db layout (no ItemTable/cursorDiskKV)");
    }
  } catch (err: any) {
    warnings.push(`windsurf: query failed: ${err.message}`);
  } finally {
    db.close();
  }

  // Dedupe by startedAt (the upload dedupe key is (tool, startedAt)); the
  // ItemTable and cursorDiskKV layouts can describe the same conversation.
  const seen = new Set<number>();
  const deduped = sessions.filter((s) => {
    const t = s.startedAt.getTime();
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
  deduped.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return { sessions: deduped, warnings };
}

/** Newer Cursor-compatible Cascade/Composer layout. */
function collectFromDiskKV(
  db: Database.Database,
  opts: WindsurfParseOptions,
  out: NormalisedSession[],
): void {
  // 1) Bubble tokens grouped by composer/conversation id.
  const bubbleAgg = new Map<
    string,
    { tokensIn: number; tokensOut: number; model?: string }
  >();
  const bubbleRows = db
    .prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'")
    .all() as { key: string; value: Buffer | string }[];
  for (const r of bubbleRows) {
    const composerId = r.key.split(":")[1];
    if (!composerId) continue;
    const obj = parseJson(r.value);
    if (!obj) continue;
    const { tin, tout } = readTokens(obj);
    if (tin === 0 && tout === 0 && !modelOf(obj)) continue;
    const a = bubbleAgg.get(composerId) ?? { tokensIn: 0, tokensOut: 0 };
    a.tokensIn += tin;
    a.tokensOut += tout;
    if (!a.model) a.model = modelOf(obj);
    bubbleAgg.set(composerId, a);
  }

  // 2) Conversation rows — composer / cascade / agent / flow.
  const convRows = db
    .prepare(
      "SELECT key, value FROM cursorDiskKV WHERE " +
        "key LIKE 'composerData:%' OR key LIKE 'cascadeData:%' OR " +
        "key LIKE 'agentData:%' OR key LIKE 'flowData:%'",
    )
    .all() as { key: string; value: Buffer | string }[];

  for (const r of convRows) {
    const obj = parseJson(r.value);
    if (!obj) continue;
    const id: string | undefined =
      obj.composerId ?? obj.conversationId ?? obj.id ?? r.key.split(":")[1];
    if (!id) continue;

    const createdAt = num(obj.createdAt) || num(obj.creationDate);
    if (!createdAt) continue; // can't dedupe safely without a real timestamp
    if (opts.sinceMs && createdAt < opts.sinceMs) continue;
    const lastAt = num(obj.lastUpdatedAt) || num(obj.lastSendTime) || createdAt;

    // Tokens: prefer separate bubble rows; fall back to an inline
    // `conversation[]` array when the messages live on the composer itself.
    let { tokensIn, tokensOut, model } = bubbleAgg.get(id) ?? {
      tokensIn: 0,
      tokensOut: 0,
      model: undefined as string | undefined,
    };
    if (tokensIn === 0 && tokensOut === 0) {
      const inline = sumInline(obj.conversation ?? obj.messages ?? obj.bubbles);
      tokensIn = inline.tin;
      tokensOut = inline.tout;
      model = model ?? inline.model;
    }
    if (tokensIn === 0 && tokensOut === 0) continue; // no usage → skip

    out.push({
      tool: "WINDSURF",
      startedAt: new Date(createdAt),
      endedAt: new Date(Math.max(lastAt, createdAt)),
      durationMs: Math.max(0, lastAt - createdAt),
      tokensIn: tokensIn || undefined,
      // Windsurf doesn't split fresh vs cached input — count it all as fresh so
      // the cost estimate doesn't free-ride on a cache discount it can't prove.
      tokensInputRaw: tokensIn || undefined,
      tokensOut: tokensOut || undefined,
      model: model ?? modelOf(obj) ?? "windsurf/cascade",
    });
  }
}

/** Older single-blob ItemTable chat layout. */
function collectFromItemTable(
  db: Database.Database,
  opts: WindsurfParseOptions,
  out: NormalisedSession[],
): void {
  const CHAT_KEYS = [
    "cascade.chatdata",
    "aiChat.chatdata",
    "chat.data",
    "workbench.panel.aichat.view.aichat.chatdata",
  ];
  const placeholders = CHAT_KEYS.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT key, value FROM ItemTable WHERE key IN (${placeholders})`)
    .all(...CHAT_KEYS) as { key: string; value: Buffer | string }[];

  for (const r of rows) {
    const obj = parseJson(r.value);
    if (!obj) continue;
    // Each blob holds a list of tabs/chats; tolerate a few container shapes.
    const tabs: any[] = obj.tabs ?? obj.chats ?? obj.conversations ?? (Array.isArray(obj) ? obj : []);
    for (const tab of tabs) {
      if (!tab || typeof tab !== "object") continue;
      const createdAt =
        num(tab.createdAt) || num(tab.creationDate) || num(tab.timestamp);
      if (!createdAt) continue;
      if (opts.sinceMs && createdAt < opts.sinceMs) continue;
      const lastAt = num(tab.lastUpdatedAt) || num(tab.lastSendTime) || createdAt;

      const inline = sumInline(tab.bubbles ?? tab.messages ?? tab.conversation);
      if (inline.tin === 0 && inline.tout === 0) continue;

      out.push({
        tool: "WINDSURF",
        startedAt: new Date(createdAt),
        endedAt: new Date(Math.max(lastAt, createdAt)),
        durationMs: Math.max(0, lastAt - createdAt),
        tokensIn: inline.tin || undefined,
        tokensInputRaw: inline.tin || undefined,
        tokensOut: inline.tout || undefined,
        model: inline.model ?? "windsurf/cascade",
      });
    }
  }
}

/** Sum tokens (and pick a model) across an inline array of messages/bubbles. */
function sumInline(arr: unknown): { tin: number; tout: number; model?: string } {
  let tin = 0;
  let tout = 0;
  let model: string | undefined;
  if (Array.isArray(arr)) {
    for (const m of arr) {
      if (!m || typeof m !== "object") continue;
      const t = readTokens(m);
      tin += t.tin;
      tout += t.tout;
      if (!model) model = modelOf(m);
    }
  }
  return { tin, tout, model };
}

/**
 * Read input/output token counts from the several field shapes Windsurf /
 * Codeium have shipped over time. Returns zeros when nothing matches.
 */
function readTokens(obj: any): { tin: number; tout: number } {
  const tc = obj.tokenCount ?? obj.usage ?? obj.tokens ?? obj.tokenUsage;
  if (tc && typeof tc === "object") {
    const tin =
      num(tc.inputTokens) || num(tc.input_tokens) || num(tc.input) || num(tc.prompt_tokens) || num(tc.promptTokens);
    const tout =
      num(tc.outputTokens) || num(tc.output_tokens) || num(tc.output) || num(tc.completion_tokens) || num(tc.completionTokens);
    if (tin || tout) return { tin, tout };
  }
  // Flat fields straight on the object.
  const tin = num(obj.numInputTokens) || num(obj.inputTokens) || num(obj.promptTokens);
  const tout = num(obj.numOutputTokens) || num(obj.outputTokens) || num(obj.completionTokens);
  return { tin, tout };
}

function modelOf(obj: any): string | undefined {
  const m = obj?.modelType ?? obj?.model ?? obj?.modelId ?? obj?.modelName;
  return typeof m === "string" && m ? m : undefined;
}

function defaultDbPath(): string {
  const plat = process.platform;
  if (plat === "darwin") {
    return join(
      homedir(),
      "Library/Application Support/Windsurf/User/globalStorage/state.vscdb",
    );
  }
  if (plat === "win32") {
    return join(
      process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
      "Windsurf/User/globalStorage/state.vscdb",
    );
  }
  return join(homedir(), ".config/Windsurf/User/globalStorage/state.vscdb");
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
