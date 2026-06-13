export type Tool =
  | "CLAUDE_CODE"
  | "CURSOR"
  | "ANTIGRAVITY"
  | "WINDSURF"
  | "COPILOT"
  | "CODEX"
  | "MANUAL";

export interface NormalisedSession {
  tool: Tool;
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;
  tokensIn?: number;
  tokensInputRaw?: number;
  tokensCacheRead?: number;
  tokensCacheCreate?: number;
  tokensOut?: number;
  linesAdded?: number;
  linesRemoved?: number;
  model?: string;
  projectSlug?: string;
}

export interface ParseResult {
  sessions: NormalisedSession[];
  warnings: string[];
}

export interface YearHeatmap {
  year: number;
  cells: { date: string; count: number; tokens: number }[];
}

export interface DashboardStats {
  totals: {
    tokensIn: number;
    tokensOut: number;
    tokensCacheRead: number;
    sessions: number;
    durationMs: number;
    activeDays: number;
    costUsd: number;
  };
  streak: { current: number; longest: number };
  years: YearHeatmap[];                            // one entry per year of activity
  hourly: { dow: number; hour: number; sessions: number }[]; // 7×24 grid
  velocity: { date: string; tokens: number }[];    // last 30d
  toolBreakdown: { tool: Tool; sessions: number; tokens: number; costUsd: number }[];
  topModels: { model: string; sessions: number; tokens: number; costUsd: number }[];
  firstSessionAt: string | null;
}
