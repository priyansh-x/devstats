import Link from "next/link";
import { redirect } from "next/navigation";
import { SpecCard, SpecMetric } from "@/components/spec-card";
import { Badge } from "@/components/badge";
import { YearHeatmaps } from "@/components/heatmap";
import { HourHeatmap } from "@/components/hour-heatmap";
import { VelocityChart } from "@/components/velocity-chart";
import { ImportLocalButton } from "@/components/import-button";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/stats";
import { fmtCompact, fmtDuration } from "@/lib/utils";
import { fmtUsd } from "@/lib/pricing";
import { friendlyModel } from "@/lib/model-names";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const stats = await getDashboardStats(user.id);
  const hasData = stats.totals.sessions > 0;
  const cacheRatio =
    stats.totals.tokensIn > 0
      ? (stats.totals.tokensCacheRead / stats.totals.tokensIn) * 100
      : 0;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div>
          <span className="spec-label text-ink/60">
            OPERATOR{stats.firstSessionAt ? ` · SINCE ${stats.firstSessionAt.slice(0, 10)}` : ""}
          </span>
          <h1 className="font-display text-3xl font-black leading-none mt-1">
            {user.username.toUpperCase()}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.isPublic ? "hazard" : "outline"}>
            {user.isPublic ? "PUBLIC PROFILE" : "PRIVATE"}
          </Badge>
          <Link href="/settings" className="spec-label border border-ink px-3 py-1 hover:bg-ink hover:text-hazard">
            SETTINGS
          </Link>
        </div>
      </header>

      {/* Spend coverage disclaimer — only Claude Code reports cache-aware
          token splits. Cursor reports flat counts, Antigravity reports none. */}
      {stats.toolBreakdown.some((t) => t.tool === "ANTIGRAVITY" || t.tool === "CURSOR") && (
        <div className="border border-ink bg-bone-soft px-4 py-2 mb-6 font-mono text-xs text-ink/70 leading-relaxed">
          <span className="spec-label text-hazard font-bold mr-2">EST. SPEND COVERAGE</span>
          Calculated from <b>Claude Code</b> with full cache splits.
          {stats.toolBreakdown.some((t) => t.tool === "CURSOR") && " Cursor sessions include flat token costs at Cursor-reported rates."}
          {stats.toolBreakdown.some((t) => t.tool === "ANTIGRAVITY") && " Antigravity sessions count as 0 — Google stores transcripts server-side, no local token data."}
        </div>
      )}

      {/* Summary strip */}
      <SpecCard label="OPERATIONAL SUMMARY" meta="ALL-TIME" className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
          <SpecMetric label="TOKENS IN"  value={fmtCompact(stats.totals.tokensIn)} />
          <SpecMetric label="TOKENS OUT" value={fmtCompact(stats.totals.tokensOut)} />
          <SpecMetric label="SESSIONS"   value={stats.totals.sessions} />
          <SpecMetric label="DURATION"   value={fmtDuration(stats.totals.durationMs)} />
          <SpecMetric label="STREAK"     value={stats.streak.current} unit="D" />
          <SpecMetric label="EST. SPEND" value={fmtUsd(stats.totals.costUsd)} />
        </div>
        {cacheRatio > 0 && (
          <div className="mt-5 pt-4 border-t border-ink/20 spec-label text-ink/60">
            {cacheRatio.toFixed(0)}% OF INPUT TOKENS CAME FROM CACHE
            · LONGEST STREAK {stats.streak.longest}D
            · {stats.totals.activeDays} ACTIVE DAYS
          </div>
        )}
      </SpecCard>

      {/* Year-tabbed heatmap */}
      <SpecCard label="ACTIVITY HEATMAP" meta="BY YEAR" className="mb-6">
        {hasData ? <YearHeatmaps years={stats.years} /> : <EmptyState />}
      </SpecCard>

      {/* Hour-of-week */}
      {hasData && (
        <SpecCard label="TIME-OF-DAY MAP" meta="LOCAL · SESSIONS" className="mb-6">
          <HourHeatmap data={stats.hourly} />
        </SpecCard>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <SpecCard label="TOKEN VELOCITY" meta="30D">
          {hasData ? <VelocityChart data={stats.velocity} /> : <p className="font-mono text-sm text-ink/60">No data yet.</p>}
        </SpecCard>

        <SpecCard label="TOOL BREAKDOWN">
          {stats.toolBreakdown.length === 0 ? (
            <p className="font-mono text-sm text-ink/60">No data yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.toolBreakdown.map((t) => {
                const max = stats.toolBreakdown[0]!.tokens || 1;
                const pct = Math.round((t.tokens / max) * 100);
                return (
                  <li key={t.tool}>
                    <div className="flex items-center justify-between spec-label mb-1">
                      <span>{t.tool.replace("_", " ")}</span>
                      <span className="text-ink/60">
                        {t.sessions} · {fmtCompact(t.tokens)} TKN · {fmtUsd(t.costUsd)}
                      </span>
                    </div>
                    <div className="h-2 bg-bone-soft border border-ink/20">
                      <div className="h-full bg-hazard" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SpecCard>
      </div>

      <SpecCard label="TOP MODELS / SPEND" className="mb-6">
        {stats.topModels.length === 0 ? (
          <p className="font-mono text-sm text-ink/60">No data yet.</p>
        ) : (
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="text-left spec-label text-ink/60 border-b border-ink/30">
                <th className="py-2">MODEL</th>
                <th className="py-2 text-right">SESSIONS</th>
                <th className="py-2 text-right">TOKENS</th>
                <th className="py-2 text-right">EST. SPEND</th>
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
        )}
      </SpecCard>

      {/* Reimport (after schema change) */}
      {hasData && (
        <SpecCard label="DATA OPS" className="mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <p className="font-mono text-xs text-ink/60 max-w-md">
              Wipe and reimport from <code>~/.claude</code> — useful after a parser
              update so cache-split fields and spend estimates fully populate.
            </p>
            <ImportLocalButton reset label="REBUILD FROM ~/.CLAUDE →" />
          </div>
        </SpecCard>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-ink/30 p-8 space-y-6">
      <div className="text-center space-y-2">
        <p className="spec-label text-ink/60">NO TELEMETRY RECEIVED</p>
        <h3 className="font-display text-2xl font-black">PICK A WAY IN</h3>
        <p className="font-mono text-sm text-ink/70">
          You can have data flowing in 30 seconds. Choose what you have:
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Path A — quick local Claude Code import (works only when devstats.app
            is running on the same machine as your logs, i.e. local dev). */}
        <div className="border border-ink bg-bone p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="spec-label font-bold">CLAUDE CODE</span>
            <Badge variant="hazard">FASTEST</Badge>
          </div>
          <p className="font-mono text-xs text-ink/70 flex-1">
            One-click import from <code>~/.claude/projects</code> (only when DevStats
            is on the same machine — i.e. local dev).
          </p>
          <ImportLocalButton />
        </div>

        {/* Path B — the CLI, covers all parsers including Antigravity. */}
        <div className="border border-ink bg-bone p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="spec-label font-bold">CURSOR · ANTIGRAVITY · ALL</span>
            <Badge variant="solid">RECOMMENDED</Badge>
          </div>
          <p className="font-mono text-xs text-ink/70 flex-1">
            Install the CLI and run <code>devstats sync</code>. Auto-detects every
            supported tool on your machine and uploads only new sessions.
          </p>
          <Link
            href="/settings"
            className="bg-ink text-hazard spec-label font-bold px-4 py-2 border border-ink hover:bg-hazard hover:text-ink text-center"
          >
            SET UP CLI →
          </Link>
        </div>

        {/* Path C — CSV fallback for anything else. */}
        <div className="border border-ink bg-bone p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="spec-label font-bold">CSV / OTHER</span>
            <Badge variant="outline">MANUAL</Badge>
          </div>
          <p className="font-mono text-xs text-ink/70 flex-1">
            Got an export from another tool? Upload a CSV with flexible column
            mapping — date/tokens/duration/tool, all optional except date.
          </p>
          <Link
            href="/settings"
            className="border border-ink spec-label font-bold px-4 py-2 hover:bg-ink hover:text-hazard text-center"
          >
            UPLOAD CSV →
          </Link>
        </div>
      </div>
    </div>
  );
}
