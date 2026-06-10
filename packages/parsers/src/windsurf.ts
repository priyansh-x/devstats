import { homedir } from "node:os";
import { join } from "node:path";
import { stat } from "node:fs/promises";
import type { NormalisedSession, ParseResult } from "@devstats/types";

export interface WindsurfParseOptions {
  /** Override path to Windsurf's local data dir. */
  rootPath?: string;
  sinceMs?: number;
}

/**
 * Windsurf parser — STUB.
 *
 * Windsurf (Codeium) is also a VS Code fork and stores chat state in a similar
 * `state.vscdb` SQLite under `~/Library/Application Support/Windsurf/User/...`.
 * The exact key shape and token-count fields differ from Cursor and haven't
 * been reverse-engineered in this codebase yet.
 *
 * This stub:
 *   • Detects an install (returns silently if absent).
 *   • Emits a single warning the first time it's invoked with a real install
 *     so contributors know there's data here we're not capturing.
 *   • Returns an empty session list otherwise.
 *
 * To implement properly:
 *   1. Open the state.vscdb and survey table names + key prefixes.
 *   2. Look for cursor-like `composerData:*` + `bubbleId:*` patterns, or
 *      whatever Windsurf names them.
 *   3. Group bubbles per conversation, emit NormalisedSession with real
 *      timestamps (Windsurf stores ISO timestamps on most records).
 *   4. Add a fixture .vscdb under packages/parsers/src/__tests__/fixtures/.
 *   5. Drop the stub warning.
 */
export async function parseWindsurf(opts: WindsurfParseOptions = {}): Promise<ParseResult> {
  const warnings: string[] = [];
  const sessions: NormalisedSession[] = [];

  const root = opts.rootPath ?? defaultRootPath();
  try {
    const s = await stat(root);
    if (s.isDirectory()) {
      warnings.push(
        `windsurf: install detected at ${root} but the parser is not implemented yet — contributions welcome (see packages/parsers/src/windsurf.ts).`,
      );
    }
  } catch {
    // No install — silent return is correct.
  }
  return { sessions, warnings };
}

function defaultRootPath(): string {
  const plat = process.platform;
  if (plat === "darwin") {
    return join(homedir(), "Library/Application Support/Windsurf");
  }
  if (plat === "win32") {
    return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Windsurf");
  }
  return join(homedir(), ".config/Windsurf");
}
