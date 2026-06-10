import Link from "next/link";
import { SpecCard } from "@/components/spec-card";
import { Badge } from "@/components/badge";
import { LeaderboardStrip } from "@/components/leaderboard-strip";
import { getPlatformStats } from "@/lib/platform-stats";
import { fmtCompact, fmtDuration } from "@/lib/utils";

export const revalidate = 300; // landing can be 5-minute stale

export default async function Landing() {
  const stats = await getPlatformStats();

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-hazard border border-ink" />
          <span className="font-bold tracking-tight">devstats</span>
        </div>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/leaderboard" className="hover:text-hazard">leaderboard</Link>
          <Link href="/privacy" className="hover:text-hazard">privacy</Link>
          <Link
            href="/login"
            className="bg-ink text-bone px-3 py-1.5 hover:bg-hazard hover:text-ink"
          >
            sign in →
          </Link>
        </nav>
      </header>

      {/* Hero — short, loud, real numbers, centered */}
      <section className="text-center mb-20 mt-6">
        <Badge variant="hazard" className="mb-5 inline-block">tokenmaxxing your editor</Badge>
        <h1 className="font-display text-6xl md:text-7xl font-black leading-[0.95] tracking-tight mb-6">
          Your AI coding<br />
          stats. <span className="text-hazard">Public.</span>
        </h1>
        <p className="text-lg leading-relaxed max-w-xl text-ink/80 mb-8 mx-auto">
          Plug in your Claude Code, Cursor, or Antigravity logs.
          Watch your tokens, streaks, and spend stack up.
          Climb the leaderboard if you're built like that.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="bg-ink text-bone font-bold px-5 py-3 border border-ink hover:bg-hazard hover:text-ink"
          >
            Start tracking →
          </Link>
          <Link
            href="/leaderboard"
            className="border border-ink font-bold px-5 py-3 hover:bg-ink hover:text-bone"
          >
            See the leaderboard
          </Link>
        </div>

        {stats.users > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-14 border-t border-ink pt-6 max-w-xl mx-auto">
            <Stat label="devs tracking" value={stats.users.toLocaleString()} />
            <Stat label="sessions logged" value={fmtCompact(stats.sessions)} />
            <Stat label="tokens through" value={fmtCompact(stats.tokens)} />
          </div>
        )}
      </section>

      {/* How it works — three plain steps */}
      <section className="mb-16">
        <h2 className="font-display text-3xl font-black mb-6">How it works</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { n: "1", t: "Sign in", b: "GitHub login, takes 5 seconds. No repo access needed — just your handle and email." },
            { n: "2", t: "Install the CLI", b: "One command. `devstats sync` reads your local Claude Code, Cursor, and Antigravity logs." },
            { n: "3", t: "Go public", b: "Stay private to track yourself, or flip the switch to appear on /u/your-handle and the leaderboard." },
          ].map((s) => (
            <div key={s.n} className="border border-ink p-5 bg-bone hover:shadow-[4px_4px_0_0_#0A0A0A] transition-shadow">
              <div className="font-display text-4xl font-black text-hazard leading-none mb-2">
                {s.n}
              </div>
              <h3 className="font-display text-xl font-black mb-2">{s.t}</h3>
              <p className="text-sm text-ink/70 leading-relaxed">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live leaderboard preview */}
      <LeaderboardStrip />

      <footer className="border-t border-ink pt-6 flex items-center justify-between text-sm text-ink/60">
        <span>Made for devs · BITS Pilani</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-hazard">privacy</Link>
          <a href="https://github.com/priyansh-x/devstats" className="hover:text-hazard" target="_blank" rel="noopener noreferrer">
            github →
          </a>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-black tabular-nums">{value}</div>
      <div className="text-xs text-ink/60 mt-0.5">{label}</div>
    </div>
  );
}
