import Link from "next/link";
import { redirect } from "next/navigation";
import { SpecCard } from "@/components/spec-card";
import { ApiKeyCard } from "@/components/api-key-card";
import { CsvUpload } from "@/components/csv-upload";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { CliOnboard } from "@/components/cli-onboard";
import { UsernameEdit } from "@/components/username-edit";
import { ProfileEdit } from "@/components/profile-edit";
import { DangerZone } from "@/components/danger-zone";
import { UserNav } from "@/components/user-nav";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <header className="flex items-center justify-between border-b border-ink pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-6 h-6 bg-hazard border border-ink" aria-label="home" />
          <span className="font-bold tracking-tight">devstats</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="hover:text-hazard">dashboard</Link>
          <UserNav user={{ username: user.username, isPublic: user.isPublic, avatarUrl: user.avatarUrl, countryCode: user.countryCode }} />
        </div>
      </header>

      <div>
        <h1 className="font-display text-4xl font-black leading-none mb-1">Settings</h1>
        <p className="text-ink/60 text-sm">{user.username} · {user.email}</p>
      </div>

      {!user.apiKeyHash && (
        <div className="border-2 border-hazard bg-hazard/10 p-4 text-sm">
          <div className="font-bold text-hazard mb-1">Start here</div>
          <p className="text-ink/80">
            Three quick steps to get your Claude Code, Cursor, and Antigravity data flowing.
            Generate an API key, then follow the CLI walkthrough below.
          </p>
        </div>
      )}

      <SpecCard label="API key" meta="step 1">
        <ApiKeyCard hasKey={!!user.apiKeyHash} />
      </SpecCard>

      <SpecCard label="Get your data in" meta="step 2 · CLI walkthrough">
        <CliOnboard />
      </SpecCard>

      <SpecCard label="Visibility" meta="optional">
        <PrivacyToggle initialPublic={user.isPublic} username={user.username} />
      </SpecCard>

      <SpecCard label="Import from CSV" meta="manual">
        <CsvUpload />
      </SpecCard>

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

      <SpecCard label="Account">
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
