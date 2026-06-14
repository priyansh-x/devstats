import Link from "next/link";
import { redirect } from "next/navigation";
import { SpecCard } from "@/components/spec-card";
import { UsernameEdit } from "@/components/username-edit";
import { ProfileEdit } from "@/components/profile-edit";
import { DangerZone } from "@/components/danger-zone";
import { UserNav } from "@/components/user-nav";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountSettings() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <header className="flex items-center justify-between border-b border-ink pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="font-bold tracking-tight">DevStats</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="hover:text-hazard">dashboard</Link>
          <UserNav user={{ username: user.username, isPublic: user.isPublic, avatarUrl: user.avatarUrl, countryCode: user.countryCode }} />
        </div>
      </header>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-black leading-none mb-1">Account</h1>
          <p className="text-ink/60 text-sm">{user.username} · {user.email}</p>
        </div>
        <Link href="/settings" className="text-sm hover:text-hazard">
          ← back to setup
        </Link>
      </div>

      <SpecCard label="Handle">
        <UsernameEdit initialUsername={user.username} />
      </SpecCard>

      <SpecCard label="Profile">
        <ProfileEdit
          initialBio={user.bio}
          initialLocation={user.location}
          initialCountryCode={user.countryCode}
        />
      </SpecCard>

      <SpecCard label="Account info">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-xs text-ink/60 uppercase tracking-wide">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-xs text-ink/60 uppercase tracking-wide">Joined</dt>
          <dd>{user.createdAt.toISOString().slice(0, 10)}</dd>
        </dl>
      </SpecCard>

      <SpecCard label="Your data" meta="export · delete">
        <DangerZone username={user.username} />
      </SpecCard>
    </main>
  );
}
