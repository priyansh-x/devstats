import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { SpecCard } from "@/components/spec-card";
import { Badge } from "@/components/badge";
import { UserNav } from "@/components/user-nav";
import { InviteCode, LeaveSquadButton } from "@/components/squad-forms";
import { getCurrentUser } from "@/lib/auth";
import { squadStandings } from "@/lib/squads";
import { fmtCompact, fmtDuration } from "@/lib/utils";
import { flagEmoji } from "@/lib/countries";
import type { LbPeriod, LbMetric } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

const PERIODS: { v: LbPeriod; label: string }[] = [
  { v: "daily",   label: "Today" },
  { v: "weekly",  label: "This week" },
  { v: "monthly", label: "This month" },
  { v: "alltime", label: "All time" },
];
const METRICS: { v: LbMetric; label: string }[] = [
  { v: "tokens",   label: "Tokens" },
  { v: "sessions", label: "Sessions" },
  { v: "duration", label: "Duration" },
];

export default async function SquadPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { period?: string; metric?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const period = (PERIODS.find((p) => p.v === searchParams.period)?.v ?? "weekly") as LbPeriod;
  const metric = (METRICS.find((m) => m.v === searchParams.metric)?.v ?? "tokens") as LbMetric;

  let data;
  try {
    data = await squadStandings(user.id, params.slug, period, metric);
  } catch (e: any) {
    if (e.message === "not a member") {
      // Has the link but not the membership — point them at the join flow.
      redirect("/squads");
    }
    notFound();
  }

  const fmtScore = (n: number) => (metric === "duration" ? fmtDuration(n) : fmtCompact(n));
  const qp = (p: LbPeriod, m: LbMetric) => `/squads/${params.slug}?period=${p}&metric=${m}`;

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <header className="flex items-center justify-between border-b border-ink pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="font-bold tracking-tight">devstats</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/squads" className="hover:text-hazard">squads</Link>
          <UserNav user={{ username: user.username, isPublic: user.isPublic, avatarUrl: user.avatarUrl, countryCode: user.countryCode }} />
        </div>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-ink/60">{data.squad.memberCount} members · invite</div>
          <h1 className="font-display text-4xl font-black leading-none mt-1">
            {data.squad.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <InviteCode code={data.squad.inviteCode} />
          <LeaveSquadButton slug={data.squad.slug} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Link key={p.v} href={qp(p.v, metric)}
              className={`text-xs uppercase tracking-wide font-bold px-3 py-1 border border-ink ${p.v === period ? "bg-ink text-bone" : "bg-bone hover:bg-ink/10"}`}>
              {p.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          {METRICS.map((m) => (
            <Link key={m.v} href={qp(period, m.v)}
              className={`text-xs uppercase tracking-wide font-bold px-3 py-1 border border-ink ${m.v === metric ? "bg-ink text-bone" : "bg-bone hover:bg-ink/10"}`}>
              {m.label}
            </Link>
          ))}
        </div>
      </div>

      <SpecCard label="Standings" meta={`${period} · ${metric}`}>
        {data.rows.length === 0 ? (
          <div className="border-2 border-dashed border-ink/30 p-8 text-center text-sm text-ink/70">
            Nobody's synced in this window yet. Run{" "}
            <code className="bg-ink text-hazard px-2 py-0.5">devstats sync</code> and refresh.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink/60 border-b border-ink/30">
                <th className="py-2 w-10">#</th>
                <th className="py-2">Member</th>
                <th className="py-2">Tools</th>
                <th className="py-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const isMe = r.username === user.username;
                return (
                  <tr key={r.username} className={`border-b border-ink/10 ${isMe ? "bg-hazard/10" : ""}`}>
                    <td className="py-2 font-bold tabular-nums">
                      <span className={r.rank === 1 ? "text-hazard" : ""}>{r.rank}</span>
                      {r.rank === 1 && <span className="ml-1">👑</span>}
                    </td>
                    <td className="py-2 font-bold">
                      {r.countryCode && <span className="mr-1.5">{flagEmoji(r.countryCode)}</span>}
                      {r.username}
                      {isMe && <span className="ml-2 text-xs text-hazard font-normal">you</span>}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.tools.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px]">{t.replace("_", " ").toLowerCase()}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums font-bold">{fmtScore(r.score)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SpecCard>

      <p className="text-xs text-ink/50">
        Members who haven't synced in this window don't appear. Squad standings
        include private profiles — joining is its own consent.
      </p>
    </main>
  );
}
