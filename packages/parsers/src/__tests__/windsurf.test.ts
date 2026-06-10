import { describe, it, expect, afterAll } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseWindsurf } from "../windsurf";

const dir = mkdtempSync(join(tmpdir(), "devstats-ws-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function makeDb(name: string, build: (db: Database.Database) => void): string {
  const p = join(dir, name);
  const db = new Database(p);
  build(db);
  db.close();
  return p;
}

describe("parseWindsurf — cursorDiskKV (Cascade/Composer) layout", () => {
  const dbPath = makeDb("disk.vscdb", (db) => {
    db.exec("CREATE TABLE cursorDiskKV (key TEXT PRIMARY KEY, value BLOB)");
    const ins = db.prepare("INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)");
    // composer c1 with two bubbles carrying tokens + a model
    ins.run("composerData:c1", JSON.stringify({
      composerId: "c1", createdAt: 1_700_000_000_000, lastUpdatedAt: 1_700_000_600_000,
    }));
    ins.run("bubbleId:c1:b1", JSON.stringify({ type: "user", tokenCount: { inputTokens: 100, outputTokens: 0 } }));
    ins.run("bubbleId:c1:b2", JSON.stringify({ type: "assistant", modelType: "claude-sonnet-4", tokenCount: { inputTokens: 0, outputTokens: 250 } }));
    // cascade conversation c2 with inline messages (usage shape)
    ins.run("cascadeData:c2", JSON.stringify({
      conversationId: "c2", createdAt: 1_700_100_000_000, lastUpdatedAt: 1_700_100_000_000,
      conversation: [
        { type: "assistant", model: "gpt-5", usage: { input_tokens: 40, output_tokens: 80 } },
      ],
    }));
    // composer with no usage → skipped
    ins.run("composerData:empty", JSON.stringify({ composerId: "empty", createdAt: 1_700_200_000_000 }));
  });

  it("emits one session per conversation with summed tokens + model", async () => {
    const { sessions, warnings } = await parseWindsurf({ dbPath });
    expect(warnings).toEqual([]);
    expect(sessions).toHaveLength(2);

    const c1 = sessions.find((s) => s.startedAt.getTime() === 1_700_000_000_000)!;
    expect(c1.tool).toBe("WINDSURF");
    expect(c1.tokensIn).toBe(100);
    expect(c1.tokensOut).toBe(250);
    expect(c1.tokensInputRaw).toBe(100);
    expect(c1.model).toBe("claude-sonnet-4");
    expect(c1.durationMs).toBe(600_000);

    const c2 = sessions.find((s) => s.startedAt.getTime() === 1_700_100_000_000)!;
    expect(c2.tokensIn).toBe(40);
    expect(c2.tokensOut).toBe(80);
    expect(c2.model).toBe("gpt-5");
  });

  it("honours sinceMs", async () => {
    const { sessions } = await parseWindsurf({ dbPath, sinceMs: 1_700_050_000_000 });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].startedAt.getTime()).toBe(1_700_100_000_000);
  });
});

describe("parseWindsurf — ItemTable single-blob layout", () => {
  const dbPath = makeDb("item.vscdb", (db) => {
    db.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value BLOB)");
    db.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)").run(
      "cascade.chatdata",
      JSON.stringify({
        tabs: [
          {
            createdAt: 1_700_300_000_000, lastUpdatedAt: 1_700_300_300_000,
            bubbles: [
              { type: "user", tokens: { input: 10, output: 0 } },
              { type: "assistant", model: "windsurf-swe-1", tokens: { input: 0, output: 90 } },
            ],
          },
          { createdAt: 1_700_400_000_000, bubbles: [] }, // no usage → skipped
        ],
      }),
    );
  });

  it("extracts a session from the chat blob", async () => {
    const { sessions, warnings } = await parseWindsurf({ dbPath });
    expect(warnings).toEqual([]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].tokensIn).toBe(10);
    expect(sessions[0].tokensOut).toBe(90);
    expect(sessions[0].model).toBe("windsurf-swe-1");
  });
});

describe("parseWindsurf — no install", () => {
  it("returns empty/silent for a missing db", async () => {
    const { sessions, warnings } = await parseWindsurf({ dbPath: join(dir, "nope.vscdb") });
    expect(sessions).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
