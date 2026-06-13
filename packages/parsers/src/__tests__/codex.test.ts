import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCodex } from "../codex";

function writeJsonl(path: string, lines: any[]) {
  writeFileSync(path, lines.map((l) => JSON.stringify(l)).join("\n"));
}

describe("parseCodex", () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "devstats-codex-"));

    // Simulate ~/.codex/sessions/2026/06/13/rollout-*.jsonl
    const dayDir = join(root, "2026", "06", "13");
    mkdirSync(dayDir, { recursive: true });

    // Session 1: a full rollout with session_meta, turn_context, and token usage
    writeJsonl(join(dayDir, "rollout-2026-06-13T10-00-00-aaaa-bbbb.jsonl"), [
      {
        timestamp: "2026-06-13T10:00:00Z",
        type: "session_meta",
        payload: {
          id: "aaaa-bbbb",
          timestamp: "2026-06-13T10:00:00Z",
          cwd: "/home/user/my-project",
          cli_version: "0.1.0",
          source: "cli",
          model_provider: "openai",
        },
      },
      {
        timestamp: "2026-06-13T10:00:05Z",
        type: "turn_context",
        payload: {
          model: "o4-mini",
          cwd: "/home/user/my-project",
        },
      },
      {
        timestamp: "2026-06-13T10:01:00Z",
        type: "event_msg",
        payload: {
          usage: {
            input_tokens: 1200,
            cached_input_tokens: 400,
            output_tokens: 350,
          },
        },
      },
      {
        timestamp: "2026-06-13T10:02:30Z",
        type: "response_item",
        payload: {
          model: "o4-mini",
        },
      },
      {
        timestamp: "2026-06-13T10:05:00Z",
        type: "event_msg",
        payload: {
          usage: {
            input_tokens: 800,
            cached_input_tokens: 200,
            output_tokens: 150,
          },
        },
      },
    ]);

    // Session 2: in a different date dir
    const dayDir2 = join(root, "2026", "06", "12");
    mkdirSync(dayDir2, { recursive: true });

    writeJsonl(join(dayDir2, "rollout-2026-06-12T15-00-00-cccc-dddd.jsonl"), [
      {
        timestamp: "2026-06-12T15:00:00Z",
        type: "session_meta",
        payload: {
          id: "cccc-dddd",
          timestamp: "2026-06-12T15:00:00Z",
          cwd: "/home/user/another-project",
          source: "cli",
        },
      },
      {
        timestamp: "2026-06-12T15:01:00Z",
        type: "turn_context",
        payload: { model: "gpt-4.1" },
      },
      {
        timestamp: "2026-06-12T15:03:00Z",
        type: "event_msg",
        payload: {
          usage: {
            input_tokens: 500,
            cached_input_tokens: 0,
            output_tokens: 200,
          },
        },
      },
    ]);

    // Session 3: empty file (should be skipped gracefully)
    writeFileSync(join(dayDir, "rollout-2026-06-13T12-00-00-eeee-ffff.jsonl"), "");
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("parses rollout files across date directories and sums tokens", async () => {
    const { sessions, warnings } = await parseCodex({ root });
    expect(warnings).toEqual([]);
    expect(sessions).toHaveLength(2);

    // Sorted by startedAt — session 2 (June 12) comes first
    const [s2, s1] = [sessions[0]!, sessions[1]!];

    expect(s2.tool).toBe("CODEX");
    expect(s2.startedAt.toISOString()).toBe("2026-06-12T15:00:00.000Z");
    expect(s2.model).toBe("gpt-4.1");
    expect(s2.tokensIn).toBe(500);
    expect(s2.tokensOut).toBe(200);
    expect(s2.projectSlug).toMatch(/^[0-9a-f]{12}$/);

    expect(s1.tool).toBe("CODEX");
    expect(s1.startedAt.toISOString()).toBe("2026-06-13T10:00:00.000Z");
    expect(s1.endedAt!.toISOString()).toBe("2026-06-13T10:05:00.000Z");
    expect(s1.durationMs).toBe(5 * 60 * 1000);
    expect(s1.model).toBe("o4-mini");
    // Two usage events: 1200+800 input, 400+200 cached, 350+150 output
    expect(s1.tokensIn).toBe(2000);
    expect(s1.tokensCacheRead).toBe(600);
    expect(s1.tokensInputRaw).toBe(1400);
    expect(s1.tokensOut).toBe(500);
  });

  it("respects sinceMs filter", async () => {
    const since = new Date("2026-06-13T00:00:00Z").getTime();
    const { sessions } = await parseCodex({ root, sinceMs: since });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.startedAt.toISOString()).toBe("2026-06-13T10:00:00.000Z");
  });

  it("returns empty when root does not exist", async () => {
    const { sessions, warnings } = await parseCodex({ root: "/tmp/nonexistent-codex-dir" });
    expect(sessions).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("skips empty rollout files without warnings", async () => {
    const { warnings } = await parseCodex({ root });
    expect(warnings).toEqual([]);
  });

  it("hashes project cwd into projectSlug", async () => {
    const { sessions } = await parseCodex({ root });
    const slugs = sessions.map((s) => s.projectSlug);
    // Two different cwds → two different slugs
    expect(slugs[0]).not.toBe(slugs[1]);
    // Both are 12-char hex
    for (const s of slugs) {
      expect(s).toMatch(/^[0-9a-f]{12}$/);
    }
  });
});
