import Link from "next/link";
import { Badge } from "@/components/badge";
import { LeaderboardStrip } from "@/components/leaderboard-strip";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPlatformStats } from "@/lib/platform-stats";
import { fmtCompact } from "@/lib/utils";

export const revalidate = 300;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "DevStats",
  url: "https://devstats.me",
  description: "Track tokens, sessions, streaks across Claude Code, Cursor, Copilot. Private by default.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default async function Landing() {
  const stats = await getPlatformStats();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-6 sm:mb-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-hazard border border-ink" />
          <span className="font-bold tracking-tight">DevStats</span>
        </div>
        <nav className="flex items-center gap-3 sm:gap-5 text-sm">
          <Link href="/leaderboard" className="hover:text-hazard hidden sm:inline">leaderboard</Link>
          <Link href="/squads" className="hover:text-hazard hidden sm:inline">squads</Link>
          <Link
            href="/login"
            className="bg-ink text-bone px-3 py-1.5 hover:bg-hazard hover:text-ink"
          >
            sign in →
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="text-center mb-14 mt-4 fade-up">
        <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-black leading-[0.95] tracking-tight mb-5">
          Tokenmaxxing<br />
          your <span className="text-hazard">editor.</span>
        </h1>
        <p className="text-base leading-relaxed max-w-lg text-ink/80 mb-6 mx-auto">
          Plug in your AI editor logs and watch your tokens,
          streaks, and spend stack up.
          Climb the leaderboard if you&apos;re built like that.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {["Claude Code", "Cursor", "Codex", "Windsurf", "Antigravity"].map((t) => (
            <Badge key={t} variant="outline">{t}</Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="bg-ink text-bone font-bold px-5 py-2.5 border border-ink hover:bg-hazard hover:text-ink"
          >
            Start tracking →
          </Link>
          <Link
            href="/leaderboard"
            className="border border-ink font-bold px-5 py-2.5 hover:bg-ink hover:text-bone"
          >
            See the leaderboard
          </Link>
        </div>

        {stats.users > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-10 border-t border-ink pt-5 max-w-md mx-auto">
            <Stat label="devs locked in" value={stats.users.toLocaleString()} />
            <Stat label="sessions logged" value={fmtCompact(stats.sessions)} />
            <Stat label="tokens cooked" value={fmtCompact(stats.tokens)} />
          </div>
        )}
      </section>

      {/* How it works — 4 steps in a grid, no scroll */}
      <section className="mb-12">
        <h2 className="font-display text-2xl font-black mb-5">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { n: "1", t: "Sign in", b: "GitHub login, literally 5 seconds. No repo access, just your handle." },
            { n: "2", t: "Install CLI", b: "One command. devstats sync reads your local Claude Code, Cursor, Codex, Windsurf, and Antigravity logs." },
            { n: "3", t: "Go public", b: "Stay lowkey and track privately, or go main character and hit the leaderboard." },
            { n: "4", t: "Make a squad", b: "Private group leaderboards. Invite the homies, compare stats, talk your trash." },
          ].map((s, i) => (
            <div
              key={s.n}
              className={`border border-ink p-4 bg-bone hover:shadow-[3px_3px_0_0_#0A0A0A] transition-shadow fade-up stagger-${i + 1}`}
            >
              <div className="font-display text-3xl font-black text-hazard leading-none mb-1.5">
                {s.n}
              </div>
              <h3 className="font-display text-base font-black mb-1.5">{s.t}</h3>
              <p className="text-xs text-ink/70 leading-relaxed">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live leaderboard preview */}
      <LeaderboardStrip />

      <footer className="border-t border-ink pt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-ink/60">
        <span>ts tuff</span>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/privacy" className="hover:text-hazard">privacy</Link>
          <a
            href="https://github.com/priyansh-x/devstats/issues"
            className="hover:text-hazard"
            target="_blank"
            rel="noopener noreferrer"
          >
            report a bug
          </a>
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
