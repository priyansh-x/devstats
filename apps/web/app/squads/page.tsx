import Link from "next/link";
import { redirect } from "next/navigation";
import { SpecCard } from "@/components/spec-card";
import { UserNav } from "@/components/user-nav";
import { SquadForms, InviteCode } from "@/components/squad-forms";
import { getCurrentUser } from "@/lib/auth";
import { mySquads } from "@/lib/squads";

export const dynamic = "force-dynamic";

export default async function SquadsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const squads = await mySquads(user.id);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <header className="flex items-center justify-between border-b border-ink pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="font-bold tracking-tight">DevStats</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/leaderboard" className="hover:text-hazard">leaderboard</Link>
          <UserNav user={{ username: user.username, isPublic: user.isPublic, avatarUrl: user.avatarUrl, countryCode: user.countryCode }} />
        </div>
      </header>

      <div>
        <h1 className="font-display text-4xl font-black leading-none mb-2">Squads</h1>
        <p className="text-ink/70 text-sm max-w-lg">
          A private leaderboard for your crew. One invite code, everyone syncs,
          weekly bragging rights. Squad stats are visible to members only — even
          if your global profile is private.
        </p>
      </div>

      {squads.length > 0 && (
        <SpecCard label="Your squads">
          <ul className="divide-y divide-ink/10">
            {squads.map((s) => (
              <li key={s.slug} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <Link href={`/squads/${s.slug}`} className="font-bold hover:text-hazard">
                    {s.name}
                  </Link>
                  <div className="text-xs text-ink/60">
                    {s.memberCount} member{s.memberCount === 1 ? "" : "s"}
                    {s.isCreator && " · you created this"}
                  </div>
                </div>
                <InviteCode code={s.inviteCode} />
              </li>
            ))}
          </ul>
        </SpecCard>
      )}

      <SpecCard label={squads.length ? "More" : "Get started"}>
        <SquadForms />
      </SpecCard>

      <p className="text-xs text-ink/50">
        CLI: <code className="bg-bone-soft px-1">devstats squad join &lt;code&gt;</code> ·{" "}
        <code className="bg-bone-soft px-1">devstats squad list</code> ·{" "}
        <code className="bg-bone-soft px-1">devstats squad &lt;slug&gt;</code>
      </p>
    </main>
  );
}
