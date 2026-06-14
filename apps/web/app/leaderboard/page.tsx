import Link from "next/link";
import { SpecCard } from "@/components/spec-card";
import { LeaderboardClient } from "@/components/leaderboard-client";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getLeaderboard } from "@/lib/leaderboard";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [initial, me] = await Promise.all([
    getLeaderboard("weekly", "tokens"),
    getCurrentUser(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="font-bold tracking-tight">DevStats</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-sm">
          {me ? (
            <UserNav user={{ username: me.username, isPublic: me.isPublic, avatarUrl: me.avatarUrl, countryCode: me.countryCode }} />
          ) : (
            <Link href="/login" className="bg-ink text-bone px-3 py-1.5 hover:bg-hazard hover:text-ink">
              sign in →
            </Link>
          )}
        </div>
      </header>

      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-5xl font-black leading-none mb-3">
          Leaderboard.
        </h1>
        <p className="text-ink/70 max-w-xl">
          Public profiles only. Pick a period, a metric, narrow by location, or
          flip to <b>Friends only</b> to compare against people you follow.
        </p>
      </div>

      <LeaderboardClient
        initialRows={initial}
        signedIn={!!me}
        myUsername={me?.username ?? null}
      />

      <div className="mt-8 text-xs text-ink/50">
        Refreshed daily. Antigravity and Copilot sessions don&apos;t carry token
        counts (Google and GitHub keep that data server-side), so they don&apos;t
        move the Tokens metric.
      </div>

      <footer className="border-t border-ink/20 pt-4 mt-2 flex items-center justify-end">
        <ThemeToggle />
      </footer>
    </main>
  );
}
