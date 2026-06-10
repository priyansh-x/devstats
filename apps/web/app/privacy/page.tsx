import Link from "next/link";
import { SpecCard } from "@/components/spec-card";
import { Badge } from "@/components/badge";

export const metadata = {
  title: "Privacy · DevStats",
  description: "What DevStats collects, what it never touches, and how to remove your data.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="font-bold tracking-tight">devstats</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-hazard">home</Link>
        </nav>
      </header>

      <SpecCard label="Posture" variant="hazard" className="mb-8">
        <h1 className="font-display text-5xl font-black leading-none mb-3">
          Private by default.
        </h1>
        <p className="text-base leading-relaxed max-w-xl">
          Plain-English version: what we collect, what we refuse to collect,
          what we do with it, and how to walk away.
        </p>
      </SpecCard>

      <SpecCard label="What we collect" className="mb-6">
        <ul className="font-mono text-sm space-y-3 list-none">
          <Item label="SESSION COUNTS">Counts of conversations / chats per day, per tool.</Item>
          <Item label="TOKEN COUNTS">Aggregate input / output / cache tokens per session, when the tool exposes them.</Item>
          <Item label="DURATIONS">Wall-clock time between the first and last message of a session.</Item>
          <Item label="MODEL NAMES">Short strings like <code>claude-opus-4-7</code>, <code>gpt-4o</code>.</Item>
          <Item label="HASHED PROJECT NAMES">SHA-256 truncated to 12 chars. The plaintext path never leaves your machine.</Item>
          <Item label="ACCOUNT METADATA">Email (from auth provider), chosen username, public/private toggle.</Item>
        </ul>
      </SpecCard>

      <SpecCard label="What we never collect" className="mb-6">
        <ul className="font-mono text-sm space-y-2 list-none">
          {[
            "Message content, prompts, completions, or any conversation text",
            "Real file paths, repository URLs, or directory listings",
            "Code snippets, diffs, or source contents",
            "Environment variables, API keys, or any secrets",
            "Cursor positions, edit history, or anything keystroke-level",
            "Browser activity outside the DevStats web app",
          ].map((s) => (
            <li key={s} className="flex gap-2">
              <span className="text-hazard font-bold">✗</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </SpecCard>

      <SpecCard label="How the CLI enforces this" className="mb-6">
        <p className="font-mono text-sm leading-relaxed mb-3">
          The CLI parses files locally and constructs a <code>NormalisedSession</code>{" "}
          object per session before any network call. The shape is fixed:
        </p>
        <pre className="bg-ink text-hazard p-4 font-mono text-xs overflow-x-auto">
{`{ tool, startedAt, endedAt, durationMs,
  tokensIn, tokensInputRaw, tokensCacheRead, tokensCacheCreate,
  tokensOut, linesAdded, linesRemoved, model, projectSlug }`}
        </pre>
        <p className="font-mono text-sm mt-3">
          That's it. No "raw payload" field, no "extra context" field. Run any
          command with <code className="bg-bone-soft px-1">--dry-run</code> to
          inspect exactly what would be sent before it leaves your machine.
        </p>
      </SpecCard>

      <SpecCard label="Visibility" className="mb-6">
        <p className="font-mono text-sm leading-relaxed mb-3">
          Your account starts <Badge variant="outline">PRIVATE</Badge>. Going public
          requires an explicit consent modal that lists exactly what becomes
          visible.
        </p>
        <ul className="font-mono text-sm space-y-2 list-none">
          <Item label="PRIVATE">Only you can see your dashboard. Leaderboard ignores you. <code>/u/&lt;you&gt;</code> returns 404.</Item>
          <Item label="PUBLIC">Aggregate totals, heatmap, tool/model breakdown visible at <code>/u/&lt;you&gt;</code>. Leaderboard ranks you.</Item>
          <Item label="FLIP BACK">Toggling private removes your leaderboard entries immediately and 404s the profile URL.</Item>
        </ul>
      </SpecCard>

      <SpecCard label="Third parties" className="mb-6">
        <ul className="font-mono text-sm space-y-2 list-none">
          <Item label="SUPABASE">Hosts auth + Postgres. Subject to their privacy terms.</Item>
          <Item label="UPSTASH">Hosts the Redis cache that powers the leaderboard's hourly refresh. Caches public aggregates only.</Item>
          <Item label="VERCEL">Hosts the web app. Standard request logs.</Item>
          <Item label="NO ANALYTICS">No Google Analytics, no PostHog, no Mixpanel, no third-party trackers on any page.</Item>
        </ul>
      </SpecCard>

      <SpecCard label="Removing your data" className="mb-10">
        <p className="font-mono text-sm leading-relaxed mb-3">
          From <Link href="/settings" className="text-hazard underline">/settings</Link>:
        </p>
        <ul className="font-mono text-sm space-y-2 list-none">
          <Item label="EXPORT">Download every session row as JSON. (Coming soon — wire-up tracked.)</Item>
          <Item label="DELETE ACCOUNT">Removes your user row, every session, every daily summary, every leaderboard entry. Cascade-deleted by Postgres FK. Irreversible.</Item>
        </ul>
        <p className="font-mono text-xs text-ink/60 mt-4">
          Until the in-app delete ships, email the maintainer or open an issue on
          GitHub and we'll wipe the account by hand.
        </p>
      </SpecCard>

      <footer className="border-t border-ink pt-4 text-sm text-ink/60 flex items-center justify-between">
        <span>Last updated · 2026-06-10</span>
        <Link href="/" className="hover:text-hazard">← back to home</Link>
      </footer>
    </main>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="spec-label text-ink/60 min-w-[10rem]">{label}</span>
      <span className="flex-1">{children}</span>
    </li>
  );
}
