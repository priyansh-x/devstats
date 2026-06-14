import { homedir } from "node:os";
import { join, basename } from "node:path";
import { stat, readdir, readFile } from "node:fs/promises";
import type { NormalisedSession, ParseResult } from "@devstats/types";
import { hashProjectName } from "./utils";

export interface CopilotParseOptions {
  /**
   * Override path to VS Code's `User` directory (the one that contains
   * `workspaceStorage/`). Otherwise OS-detected across Code / Code - Insiders /
   * VSCodium.
   */
  userDir?: string;
  sinceMs?: number;
}

/**
 * GitHub Copilot parser — presence telemetry.
 *
 * Caveat (same shape as Antigravity): GitHub keeps Copilot's per-request token
 * counts and transcripts on its servers, not on disk. The only individual,
 * per-user usage endpoint is org-admin-only (`/user/copilot/billing`), so a
 * client can't read token totals at all.
 *
 * What IS on disk is activity: the Copilot Chat extension writes one
 * `chatEditingSessions/<uuid>/` folder per edit/agent chat session inside the
 * VS Code workspace storage. We enumerate those as one NormalisedSession each:
 *   • startedAt  — the folder's creation time (birthtime; mtime fallback).
 *     Birthtime is immutable, so the same session re-dedupes cleanly on
 *     every sync (server dedupe key is (tool, startedAt)).
 *   • durationMs — state.json mtime − birthtime, clamped to a sane window.
 *   • projectSlug — the workspace folder's basename (from workspace.json).
 *   • tokens     — intentionally undefined. Like Antigravity, this surfaces
 *     presence/streaks/tool-mix but won't move the leaderboard's TOKENS metric
 *     until GitHub exposes per-user counts.
 *
 * This deliberately undercounts (plain inline completions and non-edit chats
 * leave no durable per-session folder) — honest partial presence beats faked
 * totals.
 */
export async function parseCopilot(opts: CopilotParseOptions = {}): Promise<ParseResult> {
  const warnings: string[] = [];
  const sessions: NormalisedSession[] = [];

  const userDir = opts.userDir ?? (await detectUserDir());
  if (!userDir) {
    // No VS Code install found — silent return.
    return { sessions, warnings };
  }

  const wsRoot = join(userDir, "workspaceStorage");
  let workspaces: string[];
  try {
    const entries = await readdir(wsRoot, { withFileTypes: true });
    workspaces = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    // No workspaceStorage — VS Code present but unused. Silent.
    return { sessions, warnings };
  }

  let sawAnyChat = false;

  for (const ws of workspaces) {
    const wsDir = join(wsRoot, ws);
    const editsDir = join(wsDir, "chatEditingSessions");

    let sessionIds: string[];
    try {
      const entries = await readdir(editsDir, { withFileTypes: true });
      sessionIds = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      continue; // workspace never used Copilot edit/agent chat
    }
    if (sessionIds.length === 0) continue;
    sawAnyChat = true;

    const projectSlug = await readWorkspaceProject(wsDir);

    for (const sid of sessionIds) {
      const sessDir = join(editsDir, sid);
      try {
        const st = await stat(sessDir);
        const startMs = birthOrMtime(st);
        if (opts.sinceMs && startMs < opts.sinceMs) continue;

        // Duration proxy: how long the session folder was being written.
        let endMs = startMs;
        try {
          const stateStat = await stat(join(sessDir, "state.json"));
          endMs = Math.max(startMs, stateStat.mtimeMs);
        } catch {
          /* no state.json — zero-length session */
        }
        const durationMs = Math.min(
          2 * 60 * 60 * 1000,
          Math.max(60_000, endMs - startMs),
        );

        sessions.push({
          tool: "COPILOT",
          startedAt: new Date(startMs),
          endedAt: new Date(startMs + durationMs),
          durationMs,
          // tokens intentionally undefined — see file header.
          model: "copilot/chat",
          projectSlug,
        });
      } catch (err) {
        warnings.push(`copilot: skipped ${sid}: ${(err as Error).message}`);
      }
    }
  }

  if (sawAnyChat) {
    warnings.push(
      "copilot: presence only — GitHub keeps Copilot token counts server-side, so sessions are logged with 0 tokens.",
    );
  }

  sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return { sessions, warnings };
}

/** Birthtime is the stable session-creation instant; fall back to mtime when
 * the filesystem doesn't report it (some Linux filesystems return 0). */
function birthOrMtime(st: { birthtimeMs: number; mtimeMs: number }): number {
  return st.birthtimeMs && st.birthtimeMs > 0 ? st.birthtimeMs : st.mtimeMs;
}

/** Read `workspace.json` → folder URI → basename, as the project slug. */
async function readWorkspaceProject(wsDir: string): Promise<string | undefined> {
  try {
    const raw = await readFile(join(wsDir, "workspace.json"), "utf8");
    const obj = JSON.parse(raw) as { folder?: string; workspace?: string };
    const uri = obj.folder ?? obj.workspace;
    if (!uri) return undefined;
    // Strip the file:// scheme and any trailing slash, then take the basename.
    const path = decodeURIComponent(uri.replace(/^file:\/\//, "")).replace(/\/+$/, "");
    const name = basename(path);
    return name ? hashProjectName(name) : undefined;
  } catch {
    return undefined;
  }
}

/** First existing VS Code `User` dir across Code / Insiders / VSCodium. */
async function detectUserDir(): Promise<string | null> {
  for (const dir of candidateUserDirs()) {
    try {
      const st = await stat(dir);
      if (st.isDirectory()) return dir;
    } catch {
      /* try next */
    }
  }
  return null;
}

function candidateUserDirs(): string[] {
  const plat = process.platform;
  const variants = ["Code", "Code - Insiders", "VSCodium"];
  if (plat === "darwin") {
    const base = join(homedir(), "Library/Application Support");
    return variants.map((v) => join(base, v, "User"));
  }
  if (plat === "win32") {
    const base = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
    return variants.map((v) => join(base, v, "User"));
  }
  const base = join(homedir(), ".config");
  return variants.map((v) => join(base, v, "User"));
}
