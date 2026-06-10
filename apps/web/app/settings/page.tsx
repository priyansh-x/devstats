import Link from "next/link";
import { redirect } from "next/navigation";
import { SpecCard } from "@/components/spec-card";
import { ApiKeyCard } from "@/components/api-key-card";
import { CsvUpload } from "@/components/csv-upload";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { CliOnboard } from "@/components/cli-onboard";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-center justify-between border-b border-ink pb-4">
        <div>
          <span className="spec-label text-ink/60">SETTINGS / OPERATOR</span>
          <h1 className="font-display text-3xl font-black leading-none mt-1">
            {user.username.toUpperCase()}
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="spec-label border border-ink px-3 py-1 hover:bg-ink hover:text-hazard"
        >
          ← DASHBOARD
        </Link>
      </header>

      {!user.apiKeyHash && (
        <div className="border-2 border-hazard bg-hazard/10 p-4 font-mono text-sm">
          <div className="spec-label font-bold text-hazard mb-1">START HERE</div>
          <p className="text-ink/80">
            New here? Three steps below to get your Claude Code, Cursor, and Antigravity
            data flowing into the dashboard. Start with <b>API KEY</b>, then <b>GET YOUR DATA IN</b>.
          </p>
        </div>
      )}

      <SpecCard label="API KEY / CLI ACCESS" meta="STEP 1">
        <ApiKeyCard hasKey={!!user.apiKeyHash} />
      </SpecCard>

      <SpecCard label="GET YOUR DATA IN" meta="STEP 2 · CLI WALKTHROUGH">
        <CliOnboard />
      </SpecCard>

      <SpecCard label="VISIBILITY / LEADERBOARD" meta="OPTIONAL">
        <PrivacyToggle initialPublic={user.isPublic} username={user.username} />
      </SpecCard>

      <SpecCard label="IMPORT / CSV UPLOAD" meta="MANUAL DATA">
        <CsvUpload />
      </SpecCard>

      <SpecCard label="PROFILE">
        <dl className="grid grid-cols-2 gap-3 font-mono text-sm">
          <dt className="spec-label text-ink/60">EMAIL</dt>
          <dd>{user.email}</dd>
          <dt className="spec-label text-ink/60">USERNAME</dt>
          <dd>{user.username}</dd>
          <dt className="spec-label text-ink/60">VISIBILITY</dt>
          <dd>{user.isPublic ? "PUBLIC" : "PRIVATE"}</dd>
          <dt className="spec-label text-ink/60">SINCE</dt>
          <dd>{user.createdAt.toISOString().slice(0, 10)}</dd>
        </dl>
      </SpecCard>
    </main>
  );
}
