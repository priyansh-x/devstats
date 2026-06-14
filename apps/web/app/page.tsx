import Link from "next/link";
import { Badge } from "@/components/badge";
import { SectionBar } from "@/components/section-bar";
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

const TOOLS = ["Claude Code", "Cursor", "Codex", "Windsurf", "Antigravity"];

export default async function Landing() {
  const stats = await getPlatformStats();
  const hasStats = stats.users > 0;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="flex items-center justify-between border-b border-ink pb-4 mb-8 sm:mb-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-hazard border border-ink" />
          <span className="font-bold tracking-tight">DevStats</span>
        </div>
        <nav className="flex items-center gap-3 sm:gap-5 text-sm">
          <Link href="/leaderboard" className="hover:text-hazard hidden sm:inline">leaderboard</Link>
          <Link href="/squads" className="hover:text-hazard hidden sm:inline">squads</Link>
          <a
            href="https://github.com/priyansh-x/devstats"
            className="hover:text-hazard hidden sm:inline"
            target="_blank"
            rel="noopener noreferrer"
          >
            github
          </a>
          <Link
            href="/login"
            className="bg-ink text-bone px-3 py-1.5 hover:bg-hazard hover:text-ink"
          >
            sign in →
          </Link>
        </nav>
      </header>

      {/* ── Hero: copy left, live product mock right ───────────── */}
      <section className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center mb-6 fade-up">
        <div className="text-center lg:text-left">
          <div className="spec-label text-hazard mb-4">// telemetry for AI editors</div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black leading-[0.95] tracking-tight mb-5">
            Tokenmaxxing<br />
            your <span className="text-hazard">editor.</span>
          </h1>
          <p className="text-base leading-relaxed max-w-md text-ink/80 mb-6 mx-auto lg:mx-0">
            One CLI reads your local logs from every AI editor and turns
            them into a dashboard — tokens, streaks, spend, and a leaderboard.
            Private by default.
          </p>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-6">
            {TOOLS.map((t) => (
              <Badge key={t} variant="outline">{t}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <Link
              href="/login"
              className="bg-ink text-bone font-bold px-5 py-2.5 border border-ink hover:bg-hazard hover:text-ink hover:shadow-[3px_3px_0_0_#0A0A0A] transition-shadow"
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
        </div>

        <MockDashboard />
      </section>

      {/* Proof bar */}
      {hasStats && (
        <div className="grid grid-cols-3 gap-4 border-y border-ink py-5 mb-14">
          <Stat label="devs locked in"  value={stats.users.toLocaleString()} />
          <Stat label="sessions logged" value={fmtCompact(stats.sessions)} />
          <Stat label="tokens cooked"   value={fmtCompact(stats.tokens)} />
        </div>
      )}

      {/* ── The problem ────────────────────────────────────────── */}
      <section className="mb-14 max-w-3xl">
        <p className="font-display text-2xl sm:text-3xl font-black leading-tight">
          You&apos;ve burned millions of tokens across five different tools.
          <span className="text-ink/40"> You have no idea what they cost,
          when you ship hardest, or how you stack up.</span>
        </p>
        <p className="text-sm text-ink/60 mt-4">
          DevStats parses the logs already sitting on your machine and answers all three.
        </p>
      </section>

      {/* ── Features: bento ────────────────────────────────────── */}
      <section className="mb-14">
        <SectionBar label="What you get" className="mb-4 border border-ink" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 auto-rows-fr">
          {/* Anchor tile — cost */}
          <div className="md:col-span-2 md:row-span-2 border border-ink bg-bone p-5 flex flex-col hover:shadow-[4px_4px_0_0_#0A0A0A] transition-shadow">
            <span className="spec-label text-ink/60">Cost tracking</span>
            <div className="font-display text-4xl sm:text-5xl font-black tabular-nums mt-2 leading-none">
              $1,284<span className="text-ink/40">.50</span>
            </div>
            <div className="text-hazard font-bold text-sm mt-2">+ $312 saved by cache</div>
            <p className="text-sm text-ink/70 leading-relaxed mt-auto pt-5 max-w-sm">
              Model-aware spend from real token counts. See what every
              refactor actually cost, which model you lean on, and how much
              prompt caching is saving you.
            </p>
          </div>

          <FeatureTile icon="//" title="Heatmap + streaks" body="GitHub-style activity grid across every tool. Current and longest streak included." />
          <FeatureTile icon="#" title="Leaderboard" body="Opt-in public ranking by tokens, sessions, duration, or spend. Resets weekly." />
          <FeatureTile icon="{}" title="Project breakdown" body="Per-folder token and cost split. Spot the repo eating your budget." />
          <FeatureTile icon=">>" title="Squads" body="Private team boards behind an invite code. Compare, compete, talk trash." />
          <FeatureTile icon="~" title="Public profile" body="A shareable /u/handle page with an OG card. Drop it in your bio." />
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="mb-14">
        <SectionBar label="3 commands. that's it." className="mb-4 border border-ink" />
        <div className="grid lg:grid-cols-2 gap-3 items-stretch">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: "1", t: "Install", b: "npm i -g devstats-cli. No repo access, ever." },
              { n: "2", t: "Sync", b: "Reads Claude Code, Cursor, Codex, Windsurf, Antigravity logs." },
              { n: "3", t: "Flex", b: "Track privately, or go public and climb." },
            ].map((s, i) => (
              <div
                key={s.n}
                className={`border border-ink p-4 bg-bone hover:shadow-[3px_3px_0_0_#0A0A0A] transition-shadow fade-up stagger-${i + 1}`}
              >
                <div className="font-display text-3xl font-black text-hazard leading-none mb-1.5">{s.n}</div>
                <h3 className="font-display text-base font-black mb-1.5">{s.t}</h3>
                <p className="text-xs text-ink/70 leading-relaxed">{s.b}</p>
              </div>
            ))}
          </div>

          {/* Terminal */}
          <div className="border border-ink bg-[#0A0A0A] text-[#F5F1EA] p-5 font-mono text-sm leading-relaxed overflow-x-auto">
            <div className="text-[#F5F1EA]/40 mb-3">~/my-project $</div>
            <div><span className="text-hazard">npm</span> i -g devstats-cli</div>
            <div className="mt-2"><span className="text-hazard">devstats</span> login</div>
            <div className="text-[#F5F1EA]/40 text-xs mt-1">→ paste your API key from devstats.me/settings</div>
            <div className="mt-2"><span className="text-hazard">devstats</span> sync</div>
            <div className="text-[#F5F1EA]/40 text-xs mt-1">→ found 142 claude-code, 38 cursor sessions</div>
            <div className="text-[#F5F1EA]/40 text-xs">→ uploaded 180 sessions (12.4M tokens)</div>
            <div className="mt-3 text-hazard">done. devstats.me/dashboard</div>
          </div>
        </div>
      </section>

      {/* ── Live leaderboard ───────────────────────────────────── */}
      <LeaderboardStrip />

      {/* ── Closing CTA ────────────────────────────────────────── */}
      <section className="border border-ink bg-hazard text-ink p-6 sm:p-8 mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-black leading-none">Your editor&apos;s been busy.</h2>
          <p className="text-ink/70 text-sm mt-2">See exactly how busy. Three commands, zero config, free.</p>
        </div>
        <Link
          href="/login"
          className="bg-ink text-bone font-bold px-6 py-3 border border-ink hover:shadow-[4px_4px_0_0_#0A0A0A] transition-shadow whitespace-nowrap"
        >
          Start tracking →
        </Link>
      </section>

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

/* ── Pieces ─────────────────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center lg:text-left">
      <div className="font-display text-2xl sm:text-3xl font-black tabular-nums">{value}</div>
      <div className="text-xs text-ink/60 mt-0.5">{label}</div>
    </div>
  );
}

function FeatureTile({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="border border-ink p-4 bg-bone hover:shadow-[3px_3px_0_0_#0A0A0A] transition-shadow">
      <span className="font-mono text-hazard text-sm font-bold">{icon}</span>
      <h3 className="font-display text-sm font-black mt-1 mb-1">{title}</h3>
      <p className="text-xs text-ink/70 leading-relaxed">{body}</p>
    </div>
  );
}

/**
 * Static, on-brand mock of the dashboard — the "screenshot" without a
 * screenshot. Built from the same SectionBar + metric vocabulary as the real
 * thing so it reads as the actual product. Dark-mode safe (utility classes
 * flip; hazard is constant).
 */
function MockDashboard() {
  // Deterministic heatmap intensities so SSR and client match.
  const COLS = 20;
  const ROWS = 7;
  const cell = (i: number) => {
    const v = Math.abs(Math.sin(i * 2.399 + 0.5));
    if (v < 0.34) return 0;
    if (v < 0.55) return 0.3;
    if (v < 0.72) return 0.55;
    if (v < 0.88) return 0.78;
    return 1;
  };

  return (
    <div className="border border-ink bg-bone fade-up stagger-2 shadow-[4px_4px_0_0_#0A0A0A] dark:shadow-[4px_4px_0_0_rgba(245,241,234,0.3)]">
      <SectionBar label="Overview" right="all-time" />
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-4 gap-3 sm:gap-4">
          {[
            { l: "Tokens in", v: "8.2M" },
            { l: "Tokens out", v: "1.4M" },
            { l: "Sessions", v: "412" },
            { l: "Streak", v: "23", u: "d" },
          ].map((m) => (
            <div key={m.l} className="flex flex-col gap-1">
              <span className="spec-label text-ink/60 text-[10px]">{m.l}</span>
              <span className="font-display text-lg sm:text-2xl font-black tabular-nums leading-none">
                {m.v}
                {m.u && <span className="ml-0.5 font-mono text-sm font-normal text-ink/60">{m.u}</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Mini heatmap */}
        <div className="mt-5 pt-4 border-t border-ink/20">
          <div className="spec-label text-ink/60 text-[10px] mb-2">Activity</div>
          <div className="flex gap-[3px] overflow-hidden">
            {Array.from({ length: COLS }).map((_, c) => (
              <div key={c} className="flex flex-col gap-[3px]">
                {Array.from({ length: ROWS }).map((_, r) => {
                  const op = cell(c * ROWS + r);
                  return (
                    <div
                      key={r}
                      className={`w-2.5 h-2.5 border border-ink/10 ${op === 0 ? "bg-bone-soft" : ""}`}
                      style={op === 0 ? undefined : { backgroundColor: `rgba(255,90,31,${op})` }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Tool bars */}
        <div className="mt-5 pt-4 border-t border-ink/20 space-y-2.5">
          {[
            { t: "claude code", pct: 100 },
            { t: "cursor", pct: 46 },
            { t: "codex", pct: 19 },
          ].map((b) => (
            <div key={b.t}>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-bold uppercase tracking-wide">{b.t}</span>
              </div>
              <div className="h-2 bg-bone-soft border border-ink/20">
                <div className="h-full bg-hazard" style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
