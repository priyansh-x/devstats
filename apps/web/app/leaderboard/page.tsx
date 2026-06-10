import Link from "next/link";
import { SpecCard } from "@/components/spec-card";
import { Badge } from "@/components/badge";
import { LeaderboardClient } from "@/components/leaderboard-client";
import { getLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  // Server-render the default tab (weekly tokens) so the page is fast and
  // crawlable. Client switches metric/period without a round-trip when needed.
  const initial = await getLeaderboard("weekly", "tokens");

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="spec-label font-bold">DEVSTATS / LEADERBOARD</span>
        </div>
        <nav className="flex items-center gap-4 spec-label">
          <Link href="/dashboard" className="hover:text-hazard">DASHBOARD</Link>
          <Link href="/settings" className="hover:text-hazard">SETTINGS</Link>
        </nav>
      </header>

      <SpecCard
        label="FIELD OPERATIONS / RANKINGS"
        meta="REFRESHED HOURLY"
        variant="hazard"
        className="mb-8"
      >
        <h1 className="font-display text-4xl font-black leading-none">
          OPERATOR RANKINGS
        </h1>
        <p className="font-mono text-sm mt-3 max-w-xl">
          Public operators only. Toggle visibility in{" "}
          <Link href="/settings" className="underline">SETTINGS</Link> to opt in.
          Absolute numbers — no shame, no ratios.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="solid">WEEKLY · TOKENS</Badge>
          <Badge variant="solid">WEEKLY · SESSIONS</Badge>
          <Badge variant="solid">ALL-TIME · DURATION</Badge>
          <Badge variant="solid">ALL-TIME · LINES</Badge>
        </div>
      </SpecCard>

      <LeaderboardClient initialRows={initial} />
    </main>
  );
}
