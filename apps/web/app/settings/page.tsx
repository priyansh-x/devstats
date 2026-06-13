import Link from "next/link";
import { redirect } from "next/navigation";
import { SpecCard } from "@/components/spec-card";
import { ApiKeyCard } from "@/components/api-key-card";
import { CsvUpload } from "@/components/csv-upload";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { CliOnboard } from "@/components/cli-onboard";
import { UserNav } from "@/components/user-nav";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
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
          <h1 className="font-display text-4xl font-black leading-none mb-1">Setup</h1>
          <p className="text-ink/60 text-sm">get your data flowing</p>
        </div>
        <Link href="/settings/account" className="text-sm hover:text-hazard">
          account settings →
        </Link>
      </div>

      {!user.apiKeyHash && (
        <div className="border-2 border-hazard bg-hazard/10 p-4 text-sm">
          <div className="font-bold text-hazard mb-1">Start here</div>
          <p className="text-ink/80">
            Generate an API key below, install the CLI, run one command.
            Works with Claude Code, Cursor, Codex, Windsurf, and Antigravity.
          </p>
        </div>
      )}

      <SpecCard label="API key" meta="step 1">
        <ApiKeyCard
          hasKey={!!user.apiKeyHash}
          issuedAt={user.apiKeyIssuedAt?.toISOString() ?? null}
          lastUsedAt={user.apiKeyLastUsedAt?.toISOString() ?? null}
        />
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
    </main>
  );
}
