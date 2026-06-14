import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCopilot } from "../copilot";

/**
 * Build a synthetic VS Code `User` dir:
 *   User/workspaceStorage/<wsHash>/
 *     workspace.json                       → { folder: "file:///.../my-project" }
 *     chatEditingSessions/<uuid>/state.json
 */
function makeEditSession(
  userDir: string,
  wsHash: string,
  folderUri: string,
  sessionId: string,
  whenMs: number,
) {
  const wsDir = join(userDir, "workspaceStorage", wsHash);
  mkdirSync(wsDir, { recursive: true });
  writeFileSync(join(wsDir, "workspace.json"), JSON.stringify({ folder: folderUri }));

  const sessDir = join(wsDir, "chatEditingSessions", sessionId);
  mkdirSync(sessDir, { recursive: true });
  const statePath = join(sessDir, "state.json");
  writeFileSync(statePath, JSON.stringify({ version: 2, sessionId, linearHistory: [] }));

  // Pin the session folder's times so the test is deterministic.
  const when = new Date(whenMs);
  const end = new Date(whenMs + 5 * 60 * 1000);
  utimesSync(sessDir, when, when);
  utimesSync(statePath, end, end);
}

describe("parseCopilot", () => {
  let userDir: string;
  const t1 = new Date("2026-06-12T15:00:00Z").getTime();
  const t2 = new Date("2026-06-13T10:00:00Z").getTime();

  beforeAll(() => {
    userDir = mkdtempSync(join(tmpdir(), "devstats-copilot-"));
    makeEditSession(userDir, "ws-aaa", "file:///home/user/my-project", "11111111-1111-1111-1111-111111111111", t1);
    makeEditSession(userDir, "ws-bbb", "file:///home/user/another-project", "22222222-2222-2222-2222-222222222222", t2);
    // A workspace that never used Copilot chat — should be ignored silently.
    mkdirSync(join(userDir, "workspaceStorage", "ws-ccc"), { recursive: true });
  });

  afterAll(() => rmSync(userDir, { recursive: true, force: true }));

  it("emits one presence session per chatEditingSessions folder, with no tokens", async () => {
    const { sessions, warnings } = await parseCopilot({ userDir });
    expect(sessions).toHaveLength(2);

    // Sorted by startedAt — the June 12 session comes first.
    const [s1, s2] = [sessions[0]!, sessions[1]!];

    expect(s1.tool).toBe("COPILOT");
    expect(s1.tokensIn).toBeUndefined();
    expect(s1.tokensOut).toBeUndefined();
    expect(s1.model).toBe("copilot/chat");
    expect(s1.projectSlug).toBe("my-project");

    expect(s2.projectSlug).toBe("another-project");

    // Presence is disclosed via a warning.
    expect(warnings.some((w) => w.includes("presence only"))).toBe(true);
  });

  it("respects sinceMs", async () => {
    const { sessions } = await parseCopilot({ userDir, sinceMs: t2 });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.projectSlug).toBe("another-project");
  });

  it("returns empty/silent when no VS Code dir is given", async () => {
    const { sessions, warnings } = await parseCopilot({ userDir: "/tmp/devstats-nonexistent-vscode" });
    expect(sessions).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
