import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { NormalisedSession, ParseResult } from "@devstats/types";
import { hashProjectName, modeOfStrings } from "./utils";

export interface CodexParseOptions {
  root?: string;
  sinceMs?: number;
}

export async function parseCodex(
  opts: CodexParseOptions = {},
): Promise<ParseResult> {
  const root = opts.root ?? join(homedir(), ".codex", "sessions");
  const warnings: string[] = [];
  const sessions: NormalisedSession[] = [];

  let exists: boolean;
  try {
    const s = await stat(root);
    exists = s.isDirectory();
  } catch {
    exists = false;
  }
  if (!exists) return { sessions, warnings };

  const rolloutFiles: string[] = [];
  await walkDir(root, rolloutFiles, warnings);

  for (const filePath of rolloutFiles) {
    try {
      const session = await parseRollout(filePath, opts.sinceMs);
      if (session) sessions.push(session);
    } catch (err) {
      warnings.push(`codex: skipped ${filePath}: ${(err as Error).message}`);
    }
  }

  sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return { sessions, warnings };
}

async function walkDir(
  dir: string,
  out: string[],
  warnings: string[],
): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    warnings.push(`codex: cannot read ${dir}: ${(err as Error).message}`);
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let s;
    try {
      s = await stat(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      await walkDir(full, out, warnings);
    } else if (entry.endsWith(".jsonl")) {
      out.push(full);
    }
  }
}

interface SessionMeta {
  id?: string;
  timestamp?: string;
  cwd?: string;
  model_provider?: string;
  cli_version?: string;
  source?: string;
}

interface TurnContext {
  model?: string;
}

interface TokenUsage {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
  total_tokens?: number;
}

async function parseRollout(
  filePath: string,
  sinceMs?: number,
): Promise<NormalisedSession | null> {
  const raw = await readFile(filePath, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return null;

  let meta: SessionMeta | undefined;
  let startTs: number | undefined;
  let endTs: number | undefined;
  let totalIn = 0;
  let totalCachedIn = 0;
  let totalOut = 0;
  const models: string[] = [];
  let cwd: string | undefined;

  for (const line of lines) {
    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    const ts = parseTimestamp(obj.timestamp);
    if (ts) {
      if (startTs === undefined || ts < startTs) startTs = ts;
      if (endTs === undefined || ts > endTs) endTs = ts;
    }

    const type = obj.type;
    const payload = obj.payload ?? obj;

    if (type === "session_meta") {
      meta = payload;
      if (payload.cwd) cwd = payload.cwd;
      if (!startTs && payload.timestamp) {
        startTs = parseTimestamp(payload.timestamp);
      }
    }

    if (type === "turn_context") {
      const tc = payload as TurnContext;
      if (tc.model) models.push(tc.model);
    }

    // Token usage can appear in event_msg payloads or as top-level fields
    const usage = extractUsage(obj);
    if (usage) {
      totalIn += usage.input_tokens ?? 0;
      totalCachedIn += usage.cached_input_tokens ?? 0;
      totalOut += usage.output_tokens ?? 0;
    }

    // response_item may carry a model field
    if (type === "response_item" && payload?.model) {
      models.push(payload.model);
    }
  }

  if (!startTs) return null;
  if (sinceMs && startTs < sinceMs) return null;

  const projectSlug = cwd ? hashProjectName(cwd) : undefined;

  return {
    tool: "CODEX",
    startedAt: new Date(startTs),
    endedAt: endTs ? new Date(endTs) : undefined,
    durationMs: endTs ? endTs - startTs : undefined,
    tokensIn: totalIn || undefined,
    tokensInputRaw: Math.max(0, totalIn - totalCachedIn) || undefined,
    tokensCacheRead: totalCachedIn || undefined,
    tokensOut: totalOut || undefined,
    model: modeOfStrings(models),
    projectSlug,
  };
}

function extractUsage(obj: any): TokenUsage | null {
  // Check nested locations where Codex stores token usage
  const candidates = [
    obj.usage,
    obj.payload?.usage,
    obj.payload?.total_token_usage,
    obj.payload?.last_token_usage,
    obj.message?.usage,
  ];
  for (const c of candidates) {
    if (c && typeof c === "object" && (c.input_tokens || c.output_tokens || c.total_tokens)) {
      return c as TokenUsage;
    }
  }
  return null;
}

function parseTimestamp(v: unknown): number | undefined {
  if (!v) return undefined;
  if (typeof v === "number") return v > 1e12 ? v : v * 1000;
  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : undefined;
  }
  return undefined;
}
