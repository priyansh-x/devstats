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
                  <td className="py-2">{m.model}</td>
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
    <div className="border-2 border-dashed border-ink/30 p-8 text-center space-y-4">
      <p className="spec-label text-ink/60">NO TELEMETRY RECEIVED</p>
      <p className="font-mono text-sm">
        Run <code className="bg-ink text-hazard px-2 py-0.5">npx devstats sync</code>{" "}
        or pull from your local Claude Code logs right now:
      </p>
      <ImportLocalButton />
    </div>
  );
}
