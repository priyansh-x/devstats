import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SpecCard, SpecMetric } from "@/components/spec-card";
import { Badge } from "@/components/badge";
import { getPublicProfile, type PublicProfile } from "@/lib/public-stats";
import { fmtCompact, fmtDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: { a: string; b: string } },
): Promise<Metadata> {
  return {
    title: `${params.a} vs ${params.b} · DevStats`,
    description: `Side-by-side comparison of two public operators on DevStats.`,
  };
}

export default async function Compare(
  { params }: { params: { a: string; b: string } },
) {
  const [a, b] = await Promise.all([
    getPublicProfile(params.a),
    getPublicProfile(params.b),
  ]);
  if (!a || !b) notFound();

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="spec-label font-bold">DEVSTATS / HEAD-TO-HEAD</span>
        </div>
        <nav className="flex items-center gap-4 spec-label">
          <Link href="/leaderboard" className="hover:text-hazard">LEADERBOARD</Link>
        </nav>
      </header>

      <SpecCard label="MATCHUP" variant="hazard" className="mb-8">
        <div className="grid md:grid-cols-3 gap-4 items-center">
          <Side profile={a} align="left" />
          <div className="text-center">
            <p className="spec-label text-ink/60">VERSUS</p>
            <p className="font-display text-6xl font-black leading-none mt-1">VS</p>
          </div>
          <Side profile={b} align="right" />
        </div>
      </SpecCard>

      <SpecCard label="SCOREBOARD" className="mb-6">
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="text-left spec-label text-ink/60 border-b border-ink/30">
              <th className="py-2 w-1/3">METRIC</th>
              <th className="py-2 text-right">{a.username}</th>
              <th className="py-2 w-12 text-center">→</th>
              <th className="py-2 text-right">{b.username}</th>
            </tr>
          </thead>
          <tbody>
            <Row label="TOKENS IN"   a={a.stats.totals.tokensIn}  b={b.stats.totals.tokensIn}  fmt={fmtCompact} aName={a.username} bName={b.username} />
            <Row label="TOKENS OUT"  a={a.stats.totals.tokensOut} b={b.stats.totals.tokensOut} fmt={fmtCompact} aName={a.username} bName={b.username} />
            <Row label="SESSIONS"    a={a.stats.totals.sessions}  b={b.stats.totals.sessions}  fmt={(n) => `${n}`} aName={a.username} bName={b.username} />
            <Row label="DURATION"    a={a.stats.totals.durationMs} b={b.stats.totals.durationMs} fmt={fmtDuration} aName={a.username} bName={b.username} />
            <Row label="ACTIVE DAYS" a={a.stats.totals.activeDays} b={b.stats.totals.activeDays} fmt={(n) => `${n}`} aName={a.username} bName={b.username} />
            <Row label="STREAK · CURRENT" a={a.stats.streak.current} b={b.stats.streak.current} fmt={(n) => `${n}D`} aName={a.username} bName={b.username} />
            <Row label="STREAK · LONGEST" a={a.stats.streak.longest} b={b.stats.streak.longest} fmt={(n) => `${n}D`} aName={a.username} bName={b.username} />
          </tbody>
        </table>
      </SpecCard>

      <SpecCard label="TOOL COVERAGE" className="mb-10">
        <div className="grid grid-cols-2 gap-6">
          <ToolList profile={a} />
          <ToolList profile={b} />
        </div>
      </SpecCard>

      <footer className="border-t border-ink pt-4 spec-label text-ink/60 flex items-center justify-between">
        <span>HEAD-TO-HEAD · POWERED BY DEVSTATS</span>
        <Link href="/leaderboard" className="hover:text-hazard">← LEADERBOARD</Link>
      </footer>
    </main>
  );
}

function Side({ profile, align }: { profile: PublicProfile; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <span className="spec-label">OPERATOR</span>
      <h2 className="font-display text-3xl font-black leading-none mt-1">
        {profile.username.toUpperCase()}
      </h2>
      <div className={`flex flex-wrap gap-1 mt-3 ${align === "right" ? "justify-end" : ""}`}>
        {profile.stats.toolBreakdown.slice(0, 3).map((t) => (
          <Badge key={t.tool} variant="solid" className="text-[10px]">{t.tool.replace("_", " ")}</Badge>
        ))}
      </div>
      <p className="spec-label text-ink/70 mt-2">SINCE {profile.createdAt.slice(0, 10)}</p>
    </div>
  );
}

function Row({
  label, a, b, fmt, aName, bName,
}: {
  label: string;
  a: number; b: number;
  fmt: (n: number) => string;
  aName: string; bName: string;
}) {
  const winner = a === b ? null : a > b ? "a" : "b";
  return (
    <tr className="border-b border-ink/10">
      <td className="py-2 spec-label text-ink/70">{label}</td>
      <td className={`py-2 text-right tabular-nums ${winner === "a" ? "font-bold text-hazard" : ""}`}>
        {fmt(a)} {winner === "a" && <span className="ml-1 spec-label">▲</span>}
      </td>
      <td className="py-2 text-center text-ink/40">·</td>
      <td className={`py-2 text-right tabular-nums ${winner === "b" ? "font-bold text-hazard" : ""}`}>
        {fmt(b)} {winner === "b" && <span className="ml-1 spec-label">▲</span>}
      </td>
    </tr>
  );
}

function ToolList({ profile }: { profile: PublicProfile }) {
  return (
    <div>
      <div className="spec-label text-ink/60 mb-2">{profile.username}</div>
      {profile.stats.toolBreakdown.length === 0 ? (
        <p className="font-mono text-xs text-ink/50">No tool data.</p>
      ) : (
        <ul className="space-y-2">
          {profile.stats.toolBreakdown.map((t) => (
            <li key={t.tool} className="flex justify-between font-mono text-xs">
              <span className="spec-label">{t.tool.replace("_", " ")}</span>
              <span className="text-ink/70">{t.sessions} · {fmtCompact(t.tokens)} TKN</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
