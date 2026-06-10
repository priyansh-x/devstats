import Link from "next/link";
import { SpecCard } from "@/components/spec-card";

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <SpecCard label="404 / SIGNAL LOST" variant="hazard">
        <p className="spec-label">ERROR CODE</p>
        <h1 className="font-display text-6xl font-black leading-none mt-1 mb-4">
          NOT FOUND
        </h1>
        <p className="font-mono text-sm leading-relaxed mb-6">
          This page either never existed or has been decommissioned. Likely
          causes: a stale link, a typoed username, or a private profile whose
          owner switched back to private.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="bg-ink text-hazard spec-label font-bold px-4 py-2 border border-ink hover:bg-bone hover:text-ink"
          >
            HOME →
          </Link>
          <Link
            href="/leaderboard"
            className="border border-ink spec-label font-bold px-4 py-2 hover:bg-ink hover:text-hazard"
          >
            LEADERBOARD
          </Link>
          <Link
            href="/dashboard"
            className="border border-ink spec-label font-bold px-4 py-2 hover:bg-ink hover:text-hazard"
          >
            DASHBOARD
          </Link>
        </div>
      </SpecCard>
    </main>
  );
}
