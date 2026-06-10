import Link from "next/link";
import { redirect } from "next/navigation";
import { SpecCard } from "@/components/spec-card";
import { ApiKeyCard } from "@/components/api-key-card";
import { CsvUpload } from "@/components/csv-upload";
import { PrivacyToggle } from "@/components/privacy-toggle";
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

      <SpecCard label="VISIBILITY / LEADERBOARD">
        <PrivacyToggle initialPublic={user.isPublic} username={user.username} />
      </SpecCard>

      <SpecCard label="API KEY / CLI ACCESS">
        <ApiKeyCard hasKey={!!user.apiKeyHash} />
      </SpecCard>

      <SpecCard label="CLI / QUICKSTART" meta="LOCAL DEV">
        <p className="font-mono text-xs text-ink/70 mb-3">
          One-time setup — pick whichever you prefer:
        </p>
        <pre className="bg-ink text-hazard p-4 font-mono text-xs overflow-x-auto">
{`# Option A — shell alias (no sudo, no PATH edit)
echo 'alias devstats=~/Desktop/devstats/bin/devstats' >> ~/.zshrc
source ~/.zshrc

# Option B — symlink into your PATH
sudo ln -sf ~/Desktop/devstats/bin/devstats /usr/local/bin/devstats

# Option C — add bin/ to PATH
echo 'export PATH="$HOME/Desktop/devstats/bin:$PATH"' >> ~/.zshrc`}
        </pre>
        <p className="font-mono text-xs text-ink/70 mt-3 mb-2">Then use it from anywhere:</p>
        <pre className="bg-ink text-hazard p-4 font-mono text-xs overflow-x-auto">
{`devstats login            # paste the key above
devstats sync --dry-run   # preview
devstats sync             # upload delta
devstats whoami`}
        </pre>
        <p className="font-mono text-xs text-ink/60 mt-3">
          The CLI defaults to <code>http://localhost:3000</code>. Override with{" "}
          <code className="bg-bone-soft px-1">DEVSTATS_URL=https://…</code> once deployed.
          The published <code>devstats-cli</code> npm package lands in Phase 4.
        </p>
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
