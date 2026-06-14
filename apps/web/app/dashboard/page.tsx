import Link from "next/link";
import { redirect } from "next/navigation";
import { SpecCard, SpecMetric } from "@/components/spec-card";
import { Badge } from "@/components/badge";
import { YearHeatmaps } from "@/components/heatmap";
import { HourHeatmap } from "@/components/hour-heatmap";
import { VelocityChart } from "@/components/velocity-chart";
import { ImportLocalButton } from "@/components/import-button";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import { fmtCompact, fmtDuration } from "@/lib/utils";
import { fmtUsd } from "@/lib/pricing";
import { friendlyModel } from "@/lib/model-names";

export const dynamic = "force-dynamic";

const RANGES: { v: string; days?: number; label: string }[] = [
  { v: "30",  days: 30,  label: "30d" },
  { v: "90",  days: 90,  label: "90d" },
  { v: "365", days: 365, label: "1y" },
  { v: "all",            label: "All" },
];

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const range = RANGES.find((r) => r.v === searchParams.range) ?? RANGES[3]!;
  const [stats, lastSession] = await Promise.all([
    getDashboardStats(user.id, range.days),
    prisma.session.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  const hasData = stats.totals.sessions > 0;
  const cacheRatio =
    stats.totals.tokensIn > 0
      ? (stats.totals.tokensCacheRead / stats.totals.tokensIn) * 100
      : 0;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="font-bold tracking-tight">DevStats</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-sm">
          <Link href="/leaderboard" className="hover:text-hazard hidden sm:inline">leaderboard</Link>
          <ThemeToggle />
          <UserNav user={{ username: user.username, isPublic: user.isPublic, avatarUrl: user.avatarUrl, countryCode: user.countryCode }} />
        </div>
      </header>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <div className="text-xs sm:text-sm text-ink/60">
            {stats.firstSessionAt ? `Since ${stats.firstSessionAt.slice(0, 10)}` : "Welcome"}
            {lastSession && (
              <span> · last synced {timeAgo(lastSession.createdAt)}</span>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black leading-none mt-1">
            {user.username}
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Link
                key={r.v}
                href={r.v === "all" ? "/dashboard" : `/dashboard?range=${r.v}`}
                className={`text-[10px] sm:text-xs uppercase tracking-wide font-bold px-2 sm:px-3 py-1 border border-ink transition-colors ${
                  r.v === range.v ? "bg-ink text-bone" : "bg-bone hover:bg-ink/10"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
          <Badge variant={user.isPublic ? "hazard" : "outline"}>
            {user.isPublic ? "public" : "private"}
          </Badge>
        </div>
      </div>

      {/* Top metric strip */}
      <SpecCard label="Overview" meta={range.days ? `last ${range.label}` : "all-time"} className="mb-6 fade-up">
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6">
          <SpecMetric label="Tokens in"  value={fmtCompact(stats.totals.tokensIn)} />
          <SpecMetric label="Tokens out" value={fmtCompact(stats.totals.tokensOut)} />
          <SpecMetric label="Sessions"   value={stats.totals.sessions} />
          <SpecMetric label="Duration"   value={fmtDuration(stats.totals.durationMs)} />
          <SpecMetric label="Streak"     value={stats.streak.current} unit="d" />
          <SpecMetric label="Spend est." value={fmtUsd(stats.totals.costUsd)} />
        </div>
        <div className="mt-5 pt-4 border-t border-ink/20 text-xs text-ink/60 flex flex-wrap gap-x-4 gap-y-1">
          {cacheRatio > 0 && <span>{cacheRatio.toFixed(0)}% cache hit rate</span>}
          {stats.totals.cacheSavingsUsd > 0 && (
            <span className="text-hazard font-bold">{fmtUsd(stats.totals.cacheSavingsUsd)} saved by cache</span>
          )}
          <span>longest streak {stats.streak.longest}d</span>
          <span>{stats.totals.activeDays} active days</span>
          {stats.efficiency.tokensPerMinute > 0 && (
            <span>{fmtCompact(stats.efficiency.tokensPerMinute)} tokens/min</span>
          )}
        </div>
      </SpecCard>

      {/* Year-tabbed heatmap */}
      <SpecCard label="Activity" meta="by year" className="mb-6 fade-up stagger-1">
        {hasData ? <YearHeatmaps years={stats.years} /> : <EmptyState />}
      </SpecCard>

      {/* Hour-of-week */}
      {hasData && (
        <SpecCard label="When you code" meta="local time" className="mb-6 fade-up stagger-2">
          <HourHeatmap data={stats.hourly} />
        </SpecCard>
      )}

      <SpecCard label="Token velocity" meta="last 30 days" className="mb-6 fade-up stagger-3">
        {hasData ? <VelocityChart data={stats.velocity} /> : <p className="text-sm text-ink/60">No data yet.</p>}
      </SpecCard>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <SpecCard label="Tools" className="fade-up stagger-4">
          {stats.toolBreakdown.length === 0 ? (
            <p className="text-sm text-ink/60">No data yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.toolBreakdown.map((t, i) => {
                const max = stats.toolBreakdown[0]!.tokens || 1;
                const pct = Math.round((t.tokens / max) * 100);
                return (
                  <li key={t.tool}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold uppercase tracking-wide">{t.tool.replace("_", " ")}</span>
                      <span className="text-ink/60">
                        {t.sessions} · {fmtCompact(t.tokens)} tkn · {fmtUsd(t.costUsd)}
                      </span>
                    </div>
                    <div className="h-2 bg-bone-soft border border-ink/20">
                      <div
                        className="grow-bar h-full bg-hazard"
                        style={{ width: `${pct}%`, animationDelay: `${0.3 + i * 0.1}s` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SpecCard>

        {stats.projectBreakdown.length > 0 && (
          <SpecCard label="Projects" meta={`top ${stats.projectBreakdown.length}`} className="fade-up stagger-4">
            <ul className="space-y-3">
              {stats.projectBreakdown.map((p, i) => {
                const max = stats.projectBreakdown[0]!.costUsd || 1;
                const pct = Math.round((p.costUsd / max) * 100);
                return (
                  <li key={p.project}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold tracking-wide font-mono">{p.project}</span>
                      <span className="text-ink/60">
                        {p.sessions} · {fmtCompact(p.tokens)} tkn · {fmtUsd(p.costUsd)}
                      </span>
                    </div>
                    <div className="h-2 bg-bone-soft border border-ink/20">
                      <div
                        className="grow-bar h-full bg-ink"
                        style={{ width: `${pct}%`, animationDelay: `${0.3 + i * 0.1}s` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-[10px] text-ink/40 mt-3">Showing folder names from your local machine.</p>
          </SpecCard>
        )}
      </div>

      <SpecCard label="Top models" className="mb-6 fade-up stagger-5">
        {stats.topModels.length === 0 ? (
          <p className="text-sm text-ink/60">No data yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink/60 border-b border-ink/30">
                <th className="py-2">Model</th>
                <th className="py-2 text-right">Sessions</th>
                <th className="py-2 text-right">Tokens</th>
                <th className="py-2 text-right">Spend est.</th>
              </tr>
            </thead>
            <tbody>
              {stats.topModels.map((m) => (
                <tr key={m.model} className="border-b border-ink/10">
                  <td className="py-2">{friendlyModel(m.model)}</td>
                  <td className="py-2 text-right tabular-nums">{m.sessions}</td>
                  <td className="py-2 text-right tabular-nums">{fmtCompact(m.tokens)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtUsd(m.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </SpecCard>

      {hasData && (
        <SpecCard label="Efficiency" className="mb-6 fade-up stagger-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <SpecMetric label="Avg tokens/session" value={fmtCompact(stats.efficiency.avgTokensPerSession)} />
            <SpecMetric label="Avg session length" value={fmtDuration(stats.efficiency.avgDurationPerSession)} />
            <SpecMetric label="Tokens/min" value={fmtCompact(stats.efficiency.tokensPerMinute)} />
            <SpecMetric label="Output/input ratio" value={stats.efficiency.outputInputRatio.toFixed(2)} />
          </div>
          {stats.totals.tokensCacheRead > 0 && (
            <div className="mt-4 pt-3 border-t border-ink/20 grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-ink/60">Fresh input</div>
                <div className="font-bold tabular-nums">{fmtCompact(stats.totals.tokensInputRaw)}</div>
              </div>
              <div>
                <div className="text-ink/60">Cache read</div>
                <div className="font-bold tabular-nums">{fmtCompact(stats.totals.tokensCacheRead)}</div>
              </div>
              <div>
                <div className="text-ink/60">Cache write</div>
                <div className="font-bold tabular-nums">{fmtCompact(stats.totals.tokensCacheCreate)}</div>
              </div>
            </div>
          )}
        </SpecCard>
      )}

      {stats.toolBreakdown.some((t) => t.tool === "ANTIGRAVITY" || t.tool === "CURSOR") && (
        <div className="border border-ink bg-bone-soft px-4 py-2 mb-6 text-xs text-ink/70 leading-relaxed">
          <span className="font-bold text-hazard mr-2">Spend estimate</span>
          Calculated from <b>Claude Code</b> with full cache splits.
          {stats.toolBreakdown.some((t) => t.tool === "CURSOR") && " Cursor sessions use flat tokens-as-reported rates."}
          {stats.toolBreakdown.some((t) => t.tool === "ANTIGRAVITY") && " Antigravity is counted at 0 — Google stores transcripts server-side."}
        </div>
      )}

      {hasData && (
        <SpecCard label="Data ops" className="mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <p className="text-xs text-ink/60 max-w-md">
              Wipe and reimport from <code>~/.claude</code> — useful after a parser
              update so cache splits and spend estimates fully populate.
            </p>
            <ImportLocalButton reset label="Rebuild from ~/.claude →" />
          </div>
        </SpecCard>
      )}
    </main>
  );
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-ink/30 p-8 space-y-6">
      <div className="text-center space-y-2">
        <h3 className="font-display text-2xl font-black">No data yet</h3>
        <p className="text-sm text-ink/70">
          Pick a way in — you'll be tokenmaxxing in under a minute.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="border border-ink bg-bone p-4 flex flex-col gap-3 hover:shadow-[4px_4px_0_0_#0A0A0A] transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">Claude Code</span>
            <Badge variant="hazard">fastest</Badge>
          </div>
          <p className="text-xs text-ink/70 flex-1">
            One-click import from <code>~/.claude/projects</code> (works only when DevStats runs on the same machine).
          </p>
          <ImportLocalButton />
        </div>

        <div className="border border-ink bg-bone p-4 flex flex-col gap-3 hover:shadow-[4px_4px_0_0_#0A0A0A] transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">All tools via CLI</span>
            <Badge variant="solid">recommended</Badge>
          </div>
          <p className="text-xs text-ink/70 flex-1">
            Install the CLI, run <code>devstats sync</code>. Auto-detects Claude Code, Cursor, and Antigravity.
          </p>
          <Link
            href="/settings"
            className="bg-ink text-bone font-bold px-4 py-2 border border-ink hover:bg-hazard hover:text-ink text-center text-sm"
          >
            Set up CLI →
          </Link>
        </div>

        <div className="border border-ink bg-bone p-4 flex flex-col gap-3 hover:shadow-[4px_4px_0_0_#0A0A0A] transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">CSV / other</span>
            <Badge variant="outline">manual</Badge>
          </div>
          <p className="text-xs text-ink/70 flex-1">
            Got an export from another tool? Upload a CSV with flexible column mapping.
          </p>
          <Link
            href="/settings"
            className="border border-ink font-bold px-4 py-2 hover:bg-ink hover:text-bone text-center text-sm"
          >
            Upload CSV →
          </Link>
        </div>
      </div>
    </div>
  );
}
