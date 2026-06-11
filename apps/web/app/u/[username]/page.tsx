import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SpecCard, SpecMetric } from "@/components/spec-card";
import { Badge } from "@/components/badge";
import { YearHeatmaps } from "@/components/heatmap";
import { HourHeatmap } from "@/components/hour-heatmap";
import { ShareButton } from "@/components/share-button";
import { FollowButton } from "@/components/follow-button";
import { UserNav } from "@/components/user-nav";
import { getPublicProfile } from "@/lib/public-stats";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtCompact, fmtDuration } from "@/lib/utils";
import { friendlyModel } from "@/lib/model-names";
import { countryName, flagEmoji } from "@/lib/countries";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: { username: string } },
): Promise<Metadata> {
  const profile = await getPublicProfile(params.username);
  if (!profile) return { title: "Not found · DevStats" };
  const handle = profile.username;
  const tk = fmtCompact(profile.stats.totals.tokensIn + profile.stats.totals.tokensOut);
  return {
    title: `${handle} · DevStats`,
    description: `${profile.stats.totals.sessions} sessions · ${tk} tokens · ${profile.stats.streak.current}-day streak`,
    openGraph: {
      title: `${handle} on DevStats`,
      description: `${tk} tokens · ${profile.stats.totals.sessions} sessions · ${profile.stats.streak.current}-day streak`,
      images: [`/u/${handle}/og`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${handle} on DevStats`,
      images: [`/u/${handle}/og`],
    },
  };
}

export default async function PublicProfile(
  { params }: { params: { username: string } },
) {
  const profile = await getPublicProfile(params.username);
  if (!profile) notFound();

  const me = await getCurrentUser();
  const isSelf = me?.username === profile.username;
  let isFollowing = false;
  let followerCount = 0;
  const target = await prisma.user.findUnique({
    where: { username: profile.username },
    select: { id: true, countryCode: true, location: true },
  });
  if (target && !isSelf) {
    const [n, edge] = await Promise.all([
      prisma.friendship.count({ where: { followedId: target.id } }),
      me
        ? prisma.friendship.findUnique({
            where: { followerId_followedId: { followerId: me.id, followedId: target.id } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    followerCount = n;
    isFollowing = !!edge;
  }
  const countryCode = target?.countryCode ?? null;
  const cityLine = target?.location ?? null;

  const { stats } = profile;
  const totalTokens = stats.totals.tokensIn + stats.totals.tokensOut;
  const cacheRatio =
    stats.totals.tokensIn > 0
      ? (stats.totals.tokensCacheRead / stats.totals.tokensIn) * 100
      : 0;
  const hasAg = stats.toolBreakdown.some((t) => t.tool === "ANTIGRAVITY");

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <header className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="font-bold tracking-tight">devstats</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/leaderboard" className="hover:text-hazard">leaderboard</Link>
          {me ? (
            <UserNav user={{ username: me.username, isPublic: me.isPublic, avatarUrl: me.avatarUrl, countryCode: me.countryCode }} />
          ) : (
            <Link href="/login" className="bg-ink text-bone px-3 py-1.5 hover:bg-hazard hover:text-ink">
              sign in →
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-sm text-ink/60">
            Since {profile.createdAt.slice(0, 10)}{followerCount > 0 ? ` · ${followerCount} followers` : ""}
          </div>
          <h1 className="font-display text-5xl font-black leading-none mt-1 flex items-center gap-3 flex-wrap">
            {countryCode && (
              <span className="text-4xl" title={countryName(countryCode) ?? countryCode}>
                {flagEmoji(countryCode)}
              </span>
            )}
            <span>{profile.username}</span>
          </h1>
          {(countryCode || cityLine) && (
            <div className="text-sm text-ink/60 mt-2">
              {[cityLine, countryName(countryCode)].filter(Boolean).join(" · ")}
            </div>
          )}
          {profile.bio && (
            <p className="text-sm text-ink/80 mt-2 max-w-md leading-relaxed">
              {profile.bio}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {stats.toolBreakdown.slice(0, 4).map((t) => (
              <Badge key={t.tool} variant="solid">{t.tool.replace("_", " ").toLowerCase()}</Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Head-to-head is only meaningful between two public profiles. */}
          {me?.isPublic && !isSelf && (
            <Link
              href={`/compare/${me.username}/${profile.username}`}
              className="border border-ink font-bold px-3 py-1.5 text-xs uppercase tracking-wide hover:bg-ink hover:text-bone"
            >
              Compare vs you
            </Link>
          )}
          <FollowButton
            username={profile.username}
            initialFollowing={isFollowing}
            signedIn={!!me}
            isSelf={isSelf}
          />
          <ShareButton username={profile.username} />
        </div>
      </div>

      {hasAg && (
        <div className="border border-ink bg-bone-soft px-4 py-2 mb-6 text-xs text-ink/70">
          <span className="font-bold text-hazard mr-1">Note —</span>
          Antigravity sessions count as 0 tokens here. Google stores transcripts server-side.
        </div>
      )}

      <SpecCard label="Overview" className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <SpecMetric label="Tokens in"  value={fmtCompact(stats.totals.tokensIn)} />
          <SpecMetric label="Tokens out" value={fmtCompact(stats.totals.tokensOut)} />
          <SpecMetric label="Sessions"   value={stats.totals.sessions} />
          <SpecMetric label="Duration"   value={fmtDuration(stats.totals.durationMs)} />
          <SpecMetric label="Streak"     value={stats.streak.current} unit="d" />
        </div>
        {cacheRatio > 0 && (
          <div className="mt-5 pt-4 border-t border-ink/20 text-xs text-ink/60">
            {cacheRatio.toFixed(0)}% of input from cache · longest streak {stats.streak.longest}d · {stats.totals.activeDays} active days
          </div>
        )}
      </SpecCard>

      <SpecCard label="Activity" meta="by year" className="mb-6">
        <YearHeatmaps years={stats.years} />
      </SpecCard>

      <SpecCard label="When they code" meta="local time" className="mb-6">
        <HourHeatmap data={stats.hourly} />
      </SpecCard>

      <SpecCard label="Tools" className="mb-6">
        <ul className="space-y-3">
          {stats.toolBreakdown.map((t) => {
            const max = stats.toolBreakdown[0]?.tokens || 1;
            const pct = Math.round((t.tokens / max) * 100);
            return (
              <li key={t.tool}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold uppercase tracking-wide">{t.tool.replace("_", " ")}</span>
                  <span className="text-ink/60">
                    {t.sessions} · {fmtCompact(t.tokens)} tkn
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

      <SpecCard label="Top models" className="mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink/60 border-b border-ink/30">
              <th className="py-2">Model</th>
              <th className="py-2 text-right">Sessions</th>
              <th className="py-2 text-right">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {stats.topModels.map((m) => (
              <tr key={m.model} className="border-b border-ink/10">
                <td className="py-2">{friendlyModel(m.model)}</td>
                <td className="py-2 text-right tabular-nums">{m.sessions}</td>
                <td className="py-2 text-right tabular-nums">{fmtCompact(m.tokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SpecCard>

      <footer className="border-t-2 border-ink pt-4 mt-2 flex items-center justify-between">
        <div className="text-xs text-ink/60">
          Total · {fmtCompact(totalTokens)} tokens
          · public since {profile.createdAt.slice(0, 10)}
        </div>
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-wide border border-ink px-3 py-1 hover:bg-ink hover:text-bone"
        >
          Made with devstats →
        </Link>
      </footer>
    </main>
  );
}
