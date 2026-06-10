import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SpecCard, SpecMetric } from "@/components/spec-card";
import { Badge } from "@/components/badge";
import { YearHeatmaps } from "@/components/heatmap";
import { HourHeatmap } from "@/components/hour-heatmap";
import { ShareButton } from "@/components/share-button";
import { getPublicProfile } from "@/lib/public-stats";
import { fmtCompact, fmtDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: { username: string } },
): Promise<Metadata> {
  const profile = await getPublicProfile(params.username);
  if (!profile) return { title: "Operator not found · DevStats" };
  const handle = profile.username;
  const tk = fmtCompact(profile.stats.totals.tokensIn + profile.stats.totals.tokensOut);
  return {
    title: `${handle} · DevStats`,
    description: `${profile.stats.totals.sessions} sessions · ${tk} tokens · ${profile.stats.streak.current}-day streak`,
    openGraph: {
      title: `${handle} / DevStats`,
      description: `${tk} tokens · ${profile.stats.totals.sessions} sessions · ${profile.stats.streak.current}-day streak`,
      images: [`/u/${handle}/og`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${handle} / DevStats`,
      images: [`/u/${handle}/og`],
    },
  };
}

export default async function PublicProfile(
  { params }: { params: { username: string } },
) {
  const profile = await getPublicProfile(params.username);
  if (!profile) notFound();

  const { stats } = profile;
  const totalTokens = stats.totals.tokensIn + stats.totals.tokensOut;
  const cacheRatio =
    stats.totals.tokensIn > 0
      ? (stats.totals.tokensCacheRead / stats.totals.tokensIn) * 100
      : 0;

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="spec-label font-bold">DEVSTATS / OPERATOR PROFILE</span>
        </div>
        <nav className="flex items-center gap-4 spec-label">
          <Link href="/leaderboard" className="hover:text-hazard">LEADERBOARD</Link>
          <Link href="/dashboard" className="hover:text-hazard">DASHBOARD</Link>
        </nav>
      </header>

      <SpecCard label="OPERATOR SPEC SHEET" meta="PUBLIC PROFILE" variant="hazard" className="mb-8">
        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2">
            <span className="spec-label">OPERATOR · SINCE {profile.createdAt.slice(0, 10)}</span>
            <h1 className="font-display text-5xl font-black leading-none mt-2">
              {profile.username.toUpperCase()}
            </h1>
            <div className="flex flex-wrap gap-2 mt-4">
              {stats.toolBreakdown.slice(0, 4).map((t) => (
                <Badge key={t.tool} variant="solid">{t.tool.replace("_", " ")}</Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ShareButton username={profile.username} />
            <span className="spec-label text-ink/60">
              devstats.app/u/{profile.username}
            </span>
          </div>
        </div>
      </SpecCard>

      <SpecCard label="OPERATIONAL SUMMARY" className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <SpecMetric label="TOKENS IN"  value={fmtCompact(stats.totals.tokensIn)} />
          <SpecMetric label="TOKENS OUT" value={fmtCompact(stats.totals.tokensOut)} />
          <SpecMetric label="SESSIONS"   value={stats.totals.sessions} />
          <SpecMetric label="DURATION"   value={fmtDuration(stats.totals.durationMs)} />
          <SpecMetric label="STREAK"     value={stats.streak.current} unit="D" />
        </div>
        {cacheRatio > 0 && (
          <div className="mt-5 pt-4 border-t border-ink/20 spec-label text-ink/60">
            {cacheRatio.toFixed(0)}% INPUT FROM CACHE
            · LONGEST STREAK {stats.streak.longest}D
            · {stats.totals.activeDays} ACTIVE DAYS
          </div>
        )}
      </SpecCard>

      <SpecCard label="ACTIVITY HEATMAP" meta="BY YEAR" className="mb-6">
        <YearHeatmaps years={stats.years} />
      </SpecCard>

      <SpecCard label="TIME-OF-DAY MAP" meta="LOCAL · SESSIONS" className="mb-6">
        <HourHeatmap data={stats.hourly} />
      </SpecCard>

      <SpecCard label="TOOL BREAKDOWN" className="mb-6">
        <ul className="space-y-3">
          {stats.toolBreakdown.map((t) => {
            const max = stats.toolBreakdown[0]?.tokens || 1;
            const pct = Math.round((t.tokens / max) * 100);
            return (
              <li key={t.tool}>
                <div className="flex items-center justify-between spec-label mb-1">
                  <span>{t.tool.replace("_", " ")}</span>
                  <span className="text-ink/60">
                    {t.sessions} · {fmtCompact(t.tokens)} TKN
                  </span>
                </div>
                <div className="h-2 bg-bone-soft border border-ink/20">
                  <div className="h-full bg-hazard" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </SpecCard>

      <SpecCard label="TOP MODELS" className="mb-10">
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="text-left spec-label text-ink/60 border-b border-ink/30">
              <th className="py-2">MODEL</th>
              <th className="py-2 text-right">SESSIONS</th>
              <th className="py-2 text-right">TOKENS</th>
            </tr>
          </thead>
          <tbody>
            {stats.topModels.map((m) => (
              <tr key={m.model} className="border-b border-ink/10">
                <td className="py-2">{m.model}</td>
                <td className="py-2 text-right tabular-nums">{m.sessions}</td>
                <td className="py-2 text-right tabular-nums">{fmtCompact(m.tokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SpecCard>

      <footer className="border-t border-ink pt-4 spec-label text-ink/60">
        TOTAL: {fmtCompact(totalTokens)} TOKENS
        · PUBLIC SINCE {profile.createdAt.slice(0, 10)}
        · POWERED BY <Link href="/" className="underline">DEVSTATS</Link>
      </footer>
    </main>
  );
}
