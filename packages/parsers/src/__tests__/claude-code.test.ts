import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseClaudeCode } from "../claude-code";

function writeJsonl(path: string, lines: any[]) {
  writeFileSync(path, lines.map((l) => JSON.stringify(l)).join("\n"));
}

describe("parseClaudeCode", () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "devstats-cc-"));
    const proj = join(root, "-tmp-my-proj");
    mkdirSync(proj);

    // Two messages within 1 min → one session, with token counts
    writeJsonl(join(proj, "a.jsonl"), [
      {
        type: "user",
        sessionId: "S1",
        timestamp: "2026-03-01T10:00:00Z",
        message: { role: "user" },
      },
      {
        type: "assistant",
        sessionId: "S1",
        timestamp: "2026-03-01T10:00:30Z",
        message: {
          role: "assistant",
          model: "claude-opus-4-7",
          usage: {
            input_tokens: 100,
            cache_read_input_tokens: 500,
            cache_creation_input_tokens: 200,
            output_tokens: 80,
          },
        },
      },
      // 45-min gap → new session in same file
      {
        type: "assistant",
        sessionId: "S1",
        timestamp: "2026-03-01T10:45:30Z",
        message: {
          model: "claude-opus-4-7",
          usage: { input_tokens: 50, output_tokens: 20 },
        },
      },
      // ignored types
      { type: "queue-operation", timestamp: "2026-03-01T11:00:00Z" },
    ]);
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("groups events into sessions by 30-min gap and sums cache splits", async () => {
    const { sessions, warnings } = await parseClaudeCode({ root });
    expect(warnings).toEqual([]);
    expect(sessions).toHaveLength(2);

    const first = sessions[0]!;
    expect(first.tool).toBe("CLAUDE_CODE");
    expect(first.model).toBe("claude-opus-4-7");
    // raw input + cache read + cache create
    expect(first.tokensIn).toBe(800);
    expect(first.tokensInputRaw).toBe(100);
    expect(first.tokensCacheRead).toBe(500);
    expect(first.tokensCacheCreate).toBe(200);
    expect(first.tokensOut).toBe(80);
    // 30 second duration
    expect(first.durationMs).toBe(30_000);
    // project slug is hashed, not raw
    expect(first.projectSlug).toBeTruthy();
  });

  it("respects sinceMs filter", async () => {
    const since = new Date("2026-03-01T10:30:00Z").getTime();
    const { sessions } = await parseClaudeCode({ root, sinceMs: since });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.startedAt.toISOString()).toBe("2026-03-01T10:45:30.000Z");
  });
});
