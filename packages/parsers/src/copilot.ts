import { homedir } from "node:os";
import { join } from "node:path";
import { stat } from "node:fs/promises";
import type { NormalisedSession, ParseResult } from "@devstats/types";

export interface CopilotParseOptions {
  /** Override path to VS Code's globalStorage Copilot directory. */
  rootPath?: string;
  sinceMs?: number;
}

/**
 * GitHub Copilot parser — STUB.
 *
 * Copilot itself doesn't keep a usable token-count log on disk. The Copilot
 * Chat extension does cache message history in VS Code's IndexedDB under
 * `~/Library/Application Support/Code/User/globalStorage/github.copilot-chat`,
 * but tokens and timings are not durably stored — the canonical source is
 * GitHub's server-side usage dashboard (api.github.com/user/copilot).
 *
 * Realistic implementation path:
 *   1. Fetch GitHub Copilot usage via the user's PAT or OAuth scope from the
 *      `/user/copilot/billing` endpoint (org admins) or a future per-user
 *      usage endpoint when GitHub ships one.
 *   2. Map daily usage rows into NormalisedSession.
 *   3. Treat each (date, model) bucket as one session.
 *
 * Until that endpoint exists for individuals, this stub returns nothing.
 */
export async function parseCopilot(opts: CopilotParseOptions = {}): Promise<ParseResult> {
  const warnings: string[] = [];
  const sessions: NormalisedSession[] = [];

  const root = opts.rootPath ?? defaultRootPath();
  try {
    const s = await stat(root);
    if (s.isDirectory()) {
      warnings.push(
        "copilot: GitHub doesn't expose per-user token counts to clients yet — Copilot data has to come from the GitHub API. Parser stub only.",
      );
    }
  } catch {
    // No VS Code Copilot install — silent.
  }
  return { sessions, warnings };
}

function defaultRootPath(): string {
  const plat = process.platform;
  if (plat === "darwin") {
    return join(homedir(), "Library/Application Support/Code/User/globalStorage/github.copilot-chat");
  }
  if (plat === "win32") {
    return join(process.env.APPDATA ?? "", "Code/User/globalStorage/github.copilot-chat");
  }
  return join(homedir(), ".config/Code/User/globalStorage/github.copilot-chat");
}
