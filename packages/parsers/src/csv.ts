import type { NormalisedSession, ParseResult, Tool } from "@devstats/types";

/**
 * Generic CSV parser with caller-supplied column mapping.
 * Accepts a plain CSV string + a mapping from our canonical fields to the
 * column headers in the file. `startedAt` is required; everything else
 * optional. Quoted fields with commas are supported (RFC 4180-lite).
 */
export interface CsvMapping {
  startedAt: string;
  endedAt?: string;
  durationMinutes?: string;
  tokensIn?: string;
  tokensOut?: string;
  linesAdded?: string;
  linesRemoved?: string;
  tool?: string;
  model?: string;
  projectSlug?: string;
}

const KNOWN_TOOLS: Tool[] = ["CLAUDE_CODE", "CURSOR", "WINDSURF", "COPILOT", "CODEX", "ANTIGRAVITY", "MANUAL"];

export function parseCsv(
  text: string,
  mapping: CsvMapping,
  opts: { defaultTool?: Tool } = {},
): ParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { sessions: [], warnings: ["csv: empty file"] };

  const headers = parseRow(lines[0]!);
  const idx = (name?: string) => (name ? headers.indexOf(name) : -1);

  const cStart = idx(mapping.startedAt);
  if (cStart < 0) {
    return { sessions: [], warnings: [`csv: required column "${mapping.startedAt}" not found`] };
  }
  const cEnd      = idx(mapping.endedAt);
  const cDur      = idx(mapping.durationMinutes);
  const cTin      = idx(mapping.tokensIn);
  const cTout     = idx(mapping.tokensOut);
  const cLa       = idx(mapping.linesAdded);
  const cLr       = idx(mapping.linesRemoved);
  const cTool     = idx(mapping.tool);
  const cModel    = idx(mapping.model);
  const cSlug     = idx(mapping.projectSlug);

  const sessions: NormalisedSession[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]!);
    const startStr = row[cStart];
    if (!startStr) continue;
    const startedAt = new Date(startStr);
    if (Number.isNaN(startedAt.getTime())) {
      if (warnings.length < 5) warnings.push(`row ${i + 1}: bad date "${startStr}"`);
      continue;
    }

    const durationMs = (() => {
      if (cDur >= 0) {
        const m = parseFloat(row[cDur] ?? "");
        if (Number.isFinite(m)) return Math.round(m * 60_000);
      }
      if (cEnd >= 0 && row[cEnd]) {
        const end = new Date(row[cEnd]!);
        if (!Number.isNaN(end.getTime())) return Math.max(0, end.getTime() - startedAt.getTime());
      }
      return undefined;
    })();

    const tool = pickTool(cTool >= 0 ? row[cTool] : undefined, opts.defaultTool) ?? "MANUAL";

    sessions.push({
      tool,
      startedAt,
      endedAt: cEnd >= 0 && row[cEnd] ? new Date(row[cEnd]!) : undefined,
      durationMs,
      tokensIn:     readInt(row[cTin]),
      tokensOut:    readInt(row[cTout]),
      linesAdded:   readInt(row[cLa]),
      linesRemoved: readInt(row[cLr]),
      model:        cModel >= 0 ? (row[cModel] || undefined) : undefined,
      projectSlug:  cSlug >= 0  ? (row[cSlug]  || undefined) : undefined,
    });
  }

  return { sessions, warnings };
}

function pickTool(raw: string | undefined, fallback?: Tool): Tool | undefined {
  if (!raw) return fallback;
  const norm = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (KNOWN_TOOLS.includes(norm as Tool)) return norm as Tool;
  // Friendly aliases
  if (norm.includes("CLAUDE")) return "CLAUDE_CODE";
  if (norm.includes("CURSOR")) return "CURSOR";
  if (norm.includes("WIND"))   return "WINDSURF";
  if (norm.includes("COPIL"))  return "COPILOT";
  return fallback;
}

function readInt(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/** RFC 4180-lite: handles quoted fields with embedded commas and doubled quotes. */
function parseRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
