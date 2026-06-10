import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAntigravity } from "../antigravity";

describe("parseAntigravity", () => {
  let dir: string;
  let dbPath: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "devstats-ag-"));
    dbPath = join(dir, "state.vscdb");
    const db = new Database(dbPath);
    db.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value BLOB)");
    const insert = db.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)");
    // Two conversations: one with 3 steps (max 99), one with no real steps (just -0)
    const rows: [string, string][] = [
      ["antigravity.notification.aaa11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa-1", "true"],
      ["antigravity.notification.aaa11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa-50", "false"],
      ["antigravity.notification.aaa11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa-99", "true"],
      ["antigravity.notification.bbb22222-bbbb-bbbb-bbbb-bbbbbbbbbbbb-0", "true"],
      // unrelated keys are ignored
      ["chat.ChatSessionStore.index", '{"version":1,"entries":{}}'],
    ];
    for (const [k, v] of rows) insert.run(k, v);
    db.close();
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("emits one session per distinct conversation ID", async () => {
    const { sessions, warnings } = await parseAntigravity({ dbPath });
    expect(warnings).toEqual([]);
    expect(sessions).toHaveLength(2);
    for (const s of sessions) {
      expect(s.tool).toBe("ANTIGRAVITY");
      expect(s.tokensIn).toBeUndefined();
      expect(s.tokensOut).toBeUndefined();
      expect(s.model).toBe("antigravity/agent");
      expect(s.projectSlug).toMatch(/^[0-9a-f]{12}$/);
    }
  });

  it("returns empty for missing db (no install)", async () => {
    const { sessions, warnings } = await parseAntigravity({ dbPath: join(dir, "nope.vscdb") });
    expect(sessions).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("derives durationMs from max step number with floor and ceiling", async () => {
    const { sessions } = await parseAntigravity({ dbPath });
    // max step 99 → 99 * 10_000 = 990_000ms (16.5 min) under the 2h cap
    const richConv = sessions.find((s) => (s.durationMs ?? 0) > 60_000);
    expect(richConv?.durationMs).toBe(990_000);
    // max step 0 → floor of 60_000ms
    const thinConv = sessions.find((s) => s.durationMs === 60_000);
    expect(thinConv).toBeTruthy();
  });

  it("spreads conversations across the activity window deterministically", async () => {
    const win = { loMs: Date.parse("2026-01-01T00:00:00Z"), hiMs: Date.parse("2026-05-01T00:00:00Z") };
    const a = await parseAntigravity({ dbPath, activityWindow: win });
    const b = await parseAntigravity({ dbPath, activityWindow: win });

    // Every timestamp falls inside the window…
    for (const s of a.sessions) {
      expect(s.startedAt.getTime()).toBeGreaterThanOrEqual(win.loMs);
      expect(s.startedAt.getTime()).toBeLessThan(win.hiMs);
    }
    // …the two conversations land on different days (not collapsed onto one)…
    const days = new Set(a.sessions.map((s) => s.startedAt.toISOString().slice(0, 10)));
    expect(days.size).toBe(2);
    // …and the placement is stable across runs (so re-syncs dedupe cleanly).
    expect(a.sessions.map((s) => s.startedAt.getTime()))
      .toEqual(b.sessions.map((s) => s.startedAt.getTime()));
  });
});
