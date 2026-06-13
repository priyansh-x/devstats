import { cache } from "react";
import { prisma } from "./prisma";
import { sessionCost, priceFor } from "./pricing";
import type { DashboardStats, YearHeatmap, Tool } from "@devstats/types";

/**
 * Wrapped in React's `cache()` so multiple server components within the same
 * request (e.g. the dashboard page + a header that needs a count) only pay
 * one round-trip. This is a perceptible perf win on the dashboard, which
 * fans data into a half-dozen cards.
 */
export const getDashboardStats = cache(_getDashboardStats);

async function _getDashboardStats(
  userId: string,
  sinceDays?: number,
): Promise<DashboardStats> {
  const cutoff =
    sinceDays && Number.isFinite(sinceDays)
      ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
      : undefined;
  const sessions = await prisma.session.findMany({
    where: { userId, ...(cutoff ? { startedAt: { gte: cutoff } } : {}) },
    orderBy: { startedAt: "asc" },
    select: {
      tool: true,
      model: true,
      startedAt: true,
      durationMs: true,
      tokensIn: true,
      tokensInputRaw: true,
      tokensCacheRead: true,
      tokensCacheCreate: true,
      tokensOut: true,
      projectSlug: true,
    },
  });

  let tokensIn = 0;
  let tokensOut = 0;
  let tokensCacheRead = 0;
  let tokensCacheCreate = 0;
  let tokensInputRaw = 0;
  let durationMs = 0;
  let costUsd = 0;
  let cacheSavingsUsd = 0;
  const byTool = new Map<string, { sessions: number; tokens: number; costUsd: number }>();
  const byModel = new Map<string, { sessions: number; tokens: number; costUsd: number }>();
  const byProject = new Map<string, { sessions: number; tokens: number; costUsd: number }>();
  const byDay = new Map<string, { count: number; tokens: number }>();
  const hourly = new Map<string, number>();

  for (const s of sessions) {
    const tin = s.tokensIn ?? 0;
    const tout = s.tokensOut ?? 0;
    const cost = sessionCost(s);
    tokensIn += tin;
    tokensOut += tout;
    tokensCacheRead += s.tokensCacheRead ?? 0;
    tokensCacheCreate += s.tokensCacheCreate ?? 0;
    tokensInputRaw += s.tokensInputRaw ?? 0;
    durationMs += s.durationMs ?? 0;
    costUsd += cost;

    // Cache savings: what cache reads would have cost at full input price
    const cRead = s.tokensCacheRead ?? 0;
    if (cRead > 0) {
      const p = priceFor(s.model);
      cacheSavingsUsd += (cRead * (p.input - p.cacheRead)) / 1_000_000;
    }

    const t = byTool.get(s.tool) ?? { sessions: 0, tokens: 0, costUsd: 0 };
    t.sessions++; t.tokens += tin + tout; t.costUsd += cost;
    byTool.set(s.tool, t);

    if (s.model) {
      const m = byModel.get(s.model) ?? { sessions: 0, tokens: 0, costUsd: 0 };
      m.sessions++; m.tokens += tin + tout; m.costUsd += cost;
      byModel.set(s.model, m);
    }

    if (s.projectSlug) {
      const pr = byProject.get(s.projectSlug) ?? { sessions: 0, tokens: 0, costUsd: 0 };
      pr.sessions++; pr.tokens += tin + tout; pr.costUsd += cost;
      byProject.set(s.projectSlug, pr);
    }

    const day = isoDay(s.startedAt);
    const d = byDay.get(day) ?? { count: 0, tokens: 0 };
    d.count++; d.tokens += tin + tout;
    byDay.set(day, d);

    const dow = s.startedAt.getDay();
    const hour = s.startedAt.getHours();
    const k = `${dow}-${hour}`;
    hourly.set(k, (hourly.get(k) ?? 0) + 1);
  }

  // Per-year heatmaps. Each year is rendered as a full Jan 1 → Dec 31 grid.
  const years: YearHeatmap[] = [];
  if (sessions.length > 0) {
    const firstYear = sessions[0]!.startedAt.getFullYear();
    const lastYear = new Date().getFullYear();
    for (let y = lastYear; y >= firstYear; y--) {
      const cells: YearHeatmap["cells"] = [];
      const start = new Date(Date.UTC(y, 0, 1));
      const end = new Date(Date.UTC(y, 11, 31));
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const k = isoDay(d);
        const v = byDay.get(k);
        cells.push({ date: k, count: v?.count ?? 0, tokens: v?.tokens ?? 0 });
      }
      years.push({ year: y, cells });
    }
  }

  // Velocity: last 30 days regardless of year
  const today = new Date();
  const velocity: { date: string; tokens: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = isoDay(d);
    velocity.push({ date: k, tokens: byDay.get(k)?.tokens ?? 0 });
  }

  const hourlyArr: DashboardStats["hourly"] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let h = 0; h < 24; h++) {
      hourlyArr.push({ dow, hour: h, sessions: hourly.get(`${dow}-${h}`) ?? 0 });
    }
  }

  const streak = await prisma.streak.findUnique({ where: { userId } });

  const totalSessions = sessions.length;
  const avgTokensPerSession = totalSessions > 0 ? (tokensIn + tokensOut) / totalSessions : 0;
  const avgDurationPerSession = totalSessions > 0 ? durationMs / totalSessions : 0;
  const tokensPerMinute = durationMs > 0 ? ((tokensIn + tokensOut) / (durationMs / 60000)) : 0;
  const outputInputRatio = tokensIn > 0 ? tokensOut / tokensIn : 0;

  return {
    totals: {
      tokensIn,
      tokensOut,
      tokensCacheRead,
      tokensCacheCreate,
      tokensInputRaw,
      sessions: totalSessions,
      durationMs,
      activeDays: [...byDay.values()].filter((v) => v.count > 0).length,
      costUsd,
      cacheSavingsUsd,
    },
    streak: { current: streak?.currentStreak ?? 0, longest: streak?.longestStreak ?? 0 },
    years,
    hourly: hourlyArr,
    velocity,
    toolBreakdown: [...byTool.entries()]
      .map(([tool, v]) => ({ tool: tool as Tool, ...v }))
      .sort((a, b) => b.tokens - a.tokens),
    topModels: [...byModel.entries()]
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5),
    projectBreakdown: [...byProject.entries()]
      .map(([project, v]) => ({ project, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 10),
    efficiency: {
      avgTokensPerSession,
      avgDurationPerSession,
      tokensPerMinute,
      outputInputRatio,
    },
    firstSessionAt: sessions[0]?.startedAt.toISOString() ?? null,
  };
}

export async function recomputeStreak(userId: string) {
  const days = await prisma.session.findMany({
    where: { userId }, select: { startedAt: true }, orderBy: { startedAt: "asc" },
  });
  const set = new Set(days.map((d) => isoDay(d.startedAt)));
  if (set.size === 0) {
    // No sessions left (e.g. after per-tool or full data deletion) — zero the
    // streak instead of leaving a stale one behind.
    await prisma.streak.upsert({
      where: { userId },
      create: { userId, currentStreak: 0, longestStreak: 0, lastActiveDate: null },
      update: { currentStreak: 0, lastActiveDate: null },
    });
    return;
  }

  let longest = 0, current = 0;
  let prev: string | null = null;
  for (const day of [...set].sort()) {
    if (prev && dayDiff(prev, day) === 1) current++;
    else current = 1;
    if (current > longest) longest = current;
    prev = day;
  }
  const today = isoDay(new Date());
  let live = 0;
  const cursor = new Date(today);
  while (set.has(isoDay(cursor))) {
    live++;
    cursor.setDate(cursor.getDate() - 1);
  }

  await prisma.streak.upsert({
    where: { userId },
    create: { userId, currentStreak: live, longestStreak: Math.max(longest, live), lastActiveDate: prev ? new Date(prev) : null },
    update: { currentStreak: live, longestStreak: Math.max(longest, live), lastActiveDate: prev ? new Date(prev) : null },
  });
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / (24 * 60 * 60 * 1000));
}
