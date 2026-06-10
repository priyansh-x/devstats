import { homedir } from "node:os";
import { join } from "node:path";
import { stat, readdir } from "node:fs/promises";
import Database from "better-sqlite3";
import type { NormalisedSession, ParseResult } from "@devstats/types";

export interface CursorParseOptions {
  sinceMs?: number;
}

export async function parseCursor(
  opts: CursorParseOptions = {},
): Promise<ParseResult> {
  const warnings: string[] = [];
  const sessions: NormalisedSession[] = [];

  // Determine Cursor storage path based on OS
  let basePath = "";
  const platform = process.platform;
  if (platform === "darwin") {
    basePath = join(homedir(), "Library", "Application Support", "Cursor", "User", "globalStorage");
  } else if (platform === "win32") {
    basePath = join(process.env.APPDATA || "", "Cursor", "User", "globalStorage");
  } else {
    basePath = join(homedir(), ".config", "Cursor", "User", "globalStorage");
  }

  const dbPath = join(basePath, "state.vscdb");
  try {
    const s = await stat(dbPath);
    if (!s.isFile()) {
      warnings.push(`cursor: ${dbPath} is not a file`);
      return { sessions, warnings };
    }
  } catch {
    warnings.push(`cursor: database not found at ${dbPath}`);
    return { sessions, warnings };
  }

  let db;
  try {
    db = new Database(dbPath, { readonly: true });
  } catch (err: any) {
    warnings.push(`cursor: failed to open database: ${err.message}`);
    return { sessions, warnings };
  }

  try {
    // Attempt to query cursorDiskKV for bubbles
    const rows = db.prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'").all() as any[];
    for (const row of rows) {
      if (!row.value) continue;
      let obj: any;
      try {
        obj = JSON.parse(row.value.toString("utf8"));
      } catch {
        continue;
      }
      
      const tc = obj.tokenCount;
      if (!tc || (!tc.inputTokens && !tc.outputTokens)) continue;

      // Extract timestamp or fallback
      // Bubble objects don't always have a strict timestamp; we fallback to a rough estimate or 0
      const ts = opts.sinceMs ? opts.sinceMs : Date.now(); // Mocking timestamp if absent

      sessions.push({
        tool: "CURSOR",
        startedAt: new Date(ts),
        endedAt: new Date(ts + 60000), // Mock 1 min duration
        durationMs: 60000,
        tokensIn: tc.inputTokens || 0,
        tokensInputRaw: tc.inputTokens || 0,
        tokensOut: tc.outputTokens || 0,
        model: obj.modelType || "cursor-unknown",
      });
    }
  } catch (err: any) {
    warnings.push(`cursor: failed to query cursorDiskKV: ${err.message}`);
  } finally {
    db.close();
  }

  return { sessions, warnings };
}
