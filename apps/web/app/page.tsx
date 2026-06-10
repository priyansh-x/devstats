import Link from "next/link";
import { SpecCard, SpecMetric } from "@/components/spec-card";
import { Badge } from "@/components/badge";
import { LeaderboardStrip } from "@/components/leaderboard-strip";

export const dynamic = "force-dynamic";

export default async function Landing() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-hazard border border-ink" />
          <span className="spec-label font-bold">DEVSTATS / DSU-01</span>
        </div>
        <nav className="flex items-center gap-4 spec-label">
          <Link href="/leaderboard" className="hover:text-hazard">LEADERBOARD</Link>
          <Link href="/settings" className="hover:text-hazard">SETTINGS</Link>
          <Link href="/login" className="hover:text-hazard">LOG IN</Link>
          <Link
            href="/dashboard"
            className="bg-ink text-hazard px-3 py-1 border border-ink hover:bg-hazard hover:text-ink"
          >
            ENTER DASHBOARD →
          </Link>
        </nav>
      </header>

      {/* Hero — the OVR-01 spec sheet, rebadged for DevStats */}
      <SpecCard
        label="DSU-01 / DEVELOPER STATS UNIT"
        meta="FIELD OPS READY"
        variant="hazard"
        className="mb-10"
      >
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h1 className="font-display text-6xl font-black leading-none mb-4">
              Stats.<br />Sessions.<br />Streaks.
            </h1>
            <p className="font-mono text-sm leading-relaxed mb-6">
              Track tokens, models and sessions across every AI coding tool you use.
              <br />Private by default. Public when you say so.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="solid">CLAUDE CODE</Badge>
              <Badge variant="solid">CURSOR</Badge>
              <Badge variant="solid">ANTIGRAVITY</Badge>
              <Badge variant="solid">COPILOT</Badge>
              <Badge variant="solid">WINDSURF</Badge>
              <Badge variant="outline">CSV / JSON IMPORT</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 bg-bone border border-ink p-5">
            <SpecMetric label="OPERATORS ONLINE" value="2,341" />
            <SpecMetric label="SESSIONS LOGGED" value="184K" />
            <SpecMetric label="TOKENS PROCESSED" value="92.4" unit="B" />
            <SpecMetric label="ACTIVE TOOLS" value="4" />
          </div>
        </div>
      </SpecCard>

      {/* How it works */}
      <SpecCard label="DEPLOYMENT / 3-STEP" className="mb-10">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "LOG IN", b: "Sign in with GitHub or email. Generate an API key in Settings — that's how the CLI talks to your account." },
            { n: "02", t: "INSTALL CLI + SYNC", b: "One install command. Then `devstats sync` auto-detects Claude Code, Cursor, and Antigravity on your machine and uploads only new sessions." },
            { n: "03", t: "DEPLOY PROFILE", b: "Your dashboard fills in. Flip to public in Settings to appear on the leaderboard and share devstats.app/u/<you>." },
          ].map((s) => (
            <div key={s.n} className="border-l-2 border-ink pl-4">
              <span className="spec-label text-hazard font-bold">{s.n}</span>
              <h3 className="font-display text-xl font-black mt-1 mb-2">{s.t}</h3>
              <p className="font-mono text-xs leading-relaxed text-ink/70">{s.b}</p>
            </div>
          ))}
        </div>
      </SpecCard>

      {/* Where data comes from — explicit, named tools */}
      <SpecCard label="DATA SOURCES / SUPPORTED TOOLS" className="mb-10">
        <div className="grid md:grid-cols-3 gap-5 font-mono text-xs">
          {[
            { tool: "CLAUDE CODE", where: "~/.claude/projects", note: "Full token splits, cache reads, models, costs.", auto: true },
            { tool: "CURSOR",      where: "state.vscdb",        note: "One session per chat, real timestamps, token counts.", auto: true },
            { tool: "ANTIGRAVITY", where: "state.vscdb",        note: "Activity presence (Google stores transcripts in cloud — tokens not local yet).", auto: true },
          ].map((d) => (
            <div key={d.tool} className="border border-ink p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="spec-label font-bold">{d.tool}</span>
                <Badge variant="hazard">AUTO</Badge>
              </div>
              <code className="text-ink/60 text-[11px]">{d.where}</code>
              <p className="text-ink/70 mt-2 leading-relaxed">{d.note}</p>
            </div>
          ))}
        </div>
        <p className="font-mono text-xs text-ink/60 mt-4">
          Got something else? Upload a CSV in Settings — flexible column mapping.
          More parsers (Copilot, Windsurf) coming.
        </p>
      </SpecCard>

      {/* Live (or sample) leaderboard at the bottom — gives visitors a
          taste of what going public looks like before they sign up. */}
      <LeaderboardStrip />

      <footer className="border-t border-ink pt-4 flex items-center justify-between spec-label text-ink/60">
        <span>MADE FOR DEVS · v0.1.0</span>
        <Link href="/privacy" className="hover:text-hazard">PRIVACY MANIFESTO</Link>
      </footer>
    </main>
  );
}
