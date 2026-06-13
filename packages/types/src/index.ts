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
    tokensCacheCreate: number;
    tokensInputRaw: number;
    sessions: number;
    durationMs: number;
    activeDays: number;
    costUsd: number;
    cacheSavingsUsd: number;
  };
  streak: { current: number; longest: number };
  years: YearHeatmap[];
  hourly: { dow: number; hour: number; sessions: number }[];
  velocity: { date: string; tokens: number }[];
  costVelocity: { date: string; cost: number }[];
  toolBreakdown: { tool: Tool; sessions: number; tokens: number; costUsd: number }[];
  topModels: { model: string; sessions: number; tokens: number; costUsd: number }[];
  projectBreakdown: { project: string; sessions: number; tokens: number; costUsd: number }[];
  efficiency: {
    avgTokensPerSession: number;
    avgDurationPerSession: number;
    tokensPerMinute: number;
    outputInputRatio: number;
  };
  firstSessionAt: string | null;
}
