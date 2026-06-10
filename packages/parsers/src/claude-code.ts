import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { NormalisedSession, ParseResult } from "@devstats/types";
import { hashProjectName, modeOfStrings } from "./utils";

const SESSION_GAP_MS = 30 * 60 * 1000; // 30 min

interface RawEvent {
  ts: number;
  sessionId?: string;
  type: string;
  tokensInputRaw?: number;
  tokensCacheRead?: number;
  tokensCacheCreate?: number;
  tokensOut?: number;
  model?: string;
}

export interface ClaudeCodeParseOptions {
  /** Root directory containing per-project jsonl folders. Defaults to ~/.claude/projects */
  root?: string;
  /** Only include events at/after this timestamp (ms). Used for delta sync. */
  sinceMs?: number;
}

export async function parseClaudeCode(
  opts: ClaudeCodeParseOptions = {},
): Promise<ParseResult> {
  const root = opts.root ?? join(homedir(), ".claude", "projects");
  const warnings: string[] = [];
  const sessions: NormalisedSession[] = [];

  let projectDirs: string[];
  try {
    projectDirs = await readdir(root);
  } catch (err) {
    warnings.push(`claude-code: cannot read ${root}: ${(err as Error).message}`);
    return { sessions, warnings };
  }

  for (const projectDir of projectDirs) {
    const dirPath = join(root, projectDir);
    let s;
    try {
      s = await stat(dirPath);
    } catch {
      continue;
    }
    if (!s.isDirectory()) continue;
    const projectSlug = hashProjectName(projectDir);

    let files: string[];
    try {
      files = (await readdir(dirPath)).filter((f) => f.endsWith(".jsonl"));
    } catch {
      continue;
    }

    for (const file of files) {
      try {
        const events = await readEvents(join(dirPath, file), opts.sinceMs);
        const grouped = groupIntoSessions(events);
        for (const g of grouped) {
          sessions.push(buildSession(g, projectSlug));
        }
      } catch (err) {
        warnings.push(`claude-code: skipped ${file}: ${(err as Error).message}`);
      }
    }
  }

  sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return { sessions, warnings };
}

async function readEvents(
  filePath: string,
  sinceMs?: number,
): Promise<RawEvent[]> {
  const raw = await readFile(filePath, "utf8");
  const out: RawEvent[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let o: any;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const ts = Date.parse(o.timestamp ?? "");
    if (!Number.isFinite(ts)) continue;
    if (sinceMs && ts < sinceMs) continue;
    if (o.type === "queue-operation" || o.type === "mode" || o.type === "ai-title" || o.type === "last-prompt") {
      continue;
    }
    const ev: RawEvent = { ts, sessionId: o.sessionId, type: o.type };
    const msg = o.message;
    if (msg && typeof msg === "object") {
      if (typeof msg.model === "string") ev.model = msg.model;
      const u = msg.usage;
      if (u && typeof u === "object") {
        const raw = u.input_tokens ?? 0;
        const cRead = u.cache_read_input_tokens ?? 0;
        const cCreate = u.cache_creation_input_tokens ?? 0;
        const tout = u.output_tokens ?? 0;
        if (raw) ev.tokensInputRaw = raw;
        if (cRead) ev.tokensCacheRead = cRead;
        if (cCreate) ev.tokensCacheCreate = cCreate;
        if (tout) ev.tokensOut = tout;
      }
    }
    out.push(ev);
  }
  return out;
}

function groupIntoSessions(events: RawEvent[]): RawEvent[][] {
  if (events.length === 0) return [];
  events.sort((a, b) => a.ts - b.ts);
  // Bucket by sessionId first; within each bucket, split on >30min gaps.
  const buckets = new Map<string, RawEvent[]>();
  for (const e of events) {
    const key = e.sessionId ?? "_no_session_";
    const arr = buckets.get(key);
    if (arr) arr.push(e);
    else buckets.set(key, [e]);
  }
  const out: RawEvent[][] = [];
  for (const arr of buckets.values()) {
    let cur: RawEvent[] = [];
    for (const e of arr) {
      if (cur.length === 0) {
        cur.push(e);
        continue;
      }
      const prev = cur[cur.length - 1]!;
      if (e.ts - prev.ts > SESSION_GAP_MS) {
        out.push(cur);
        cur = [e];
      } else {
        cur.push(e);
      }
    }
    if (cur.length) out.push(cur);
  }
  return out;
}

function buildSession(events: RawEvent[], projectSlug: string): NormalisedSession {
  const first = events[0]!;
  const last = events[events.length - 1]!;
  let raw = 0, cRead = 0, cCreate = 0, tout = 0;
  const models: string[] = [];
  for (const e of events) {
    if (e.tokensInputRaw) raw += e.tokensInputRaw;
    if (e.tokensCacheRead) cRead += e.tokensCacheRead;
    if (e.tokensCacheCreate) cCreate += e.tokensCacheCreate;
    if (e.tokensOut) tout += e.tokensOut;
    if (e.model) models.push(e.model);
  }
  const tin = raw + cRead + cCreate;
  return {
    tool: "CLAUDE_CODE",
    startedAt: new Date(first.ts),
    endedAt: new Date(last.ts),
    durationMs: last.ts - first.ts,
    tokensIn: tin || undefined,
    tokensInputRaw: raw || undefined,
    tokensCacheRead: cRead || undefined,
    tokensCacheCreate: cCreate || undefined,
    tokensOut: tout || undefined,
    model: modeOfStrings(models),
    projectSlug,
  };
}
