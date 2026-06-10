import { describe, it, expect } from "vitest";
import { parseCsv } from "../csv";

describe("parseCsv", () => {
  it("requires the startedAt column", () => {
    const csv = "date,tokens\n2026-01-01,100\n";
    const r = parseCsv(csv, { startedAt: "missing" });
    expect(r.sessions).toHaveLength(0);
    expect(r.warnings[0]).toMatch(/required column/);
  });

  it("parses dates, durations and token counts", () => {
    const csv = [
      "when,duration_minutes,tokens_in,tokens_out,tool",
      "2026-01-01T10:00:00Z,30,1000,200,claude-code",
      "2026-01-02T10:00:00Z,60,2000,400,cursor",
    ].join("\n");
    const r = parseCsv(csv, {
      startedAt: "when",
      durationMinutes: "duration_minutes",
      tokensIn: "tokens_in",
      tokensOut: "tokens_out",
      tool: "tool",
    });
    expect(r.sessions).toHaveLength(2);
    expect(r.sessions[0]).toMatchObject({
      tool: "CLAUDE_CODE",
      tokensIn: 1000,
      tokensOut: 200,
      durationMs: 30 * 60_000,
    });
    expect(r.sessions[1]!.tool).toBe("CURSOR");
  });

  it("computes duration from endedAt when no minutes column", () => {
    const csv = "start,end\n2026-01-01T10:00:00Z,2026-01-01T10:45:00Z\n";
    const r = parseCsv(csv, { startedAt: "start", endedAt: "end" });
    expect(r.sessions[0]!.durationMs).toBe(45 * 60_000);
  });

  it("uses defaultTool when row's tool is blank or unrecognized", () => {
    const csv = "ts,tool\n2026-01-01T10:00:00Z,\n2026-01-02T10:00:00Z,sublime\n";
    const r = parseCsv(csv, { startedAt: "ts", tool: "tool" }, { defaultTool: "MANUAL" });
    expect(r.sessions.every((s) => s.tool === "MANUAL")).toBe(true);
  });

  it("survives quoted fields with embedded commas", () => {
    const csv = `start,model\n2026-01-01T00:00:00Z,"weird, model name"\n`;
    const r = parseCsv(csv, { startedAt: "start", model: "model" });
    expect(r.sessions[0]!.model).toBe("weird, model name");
  });

  it("skips rows with invalid dates and warns", () => {
    const csv = "start,t\n2026-01-01,1\nnope,2\n2026-01-02,3\n";
    const r = parseCsv(csv, { startedAt: "start", tokensIn: "t" });
    expect(r.sessions).toHaveLength(2);
    expect(r.warnings.some((w) => /bad date/.test(w))).toBe(true);
  });
});
