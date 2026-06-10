"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SpecCard } from "@/components/spec-card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to whatever log drain we configure. Console for now.
    console.error(error);
  }, [error]);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <SpecCard label="500 / SYSTEM FAULT" variant="hazard">
        <p className="spec-label">ERROR CODE</p>
        <h1 className="font-display text-6xl font-black leading-none mt-1 mb-4">
          SOMETHING BROKE
        </h1>
        <p className="font-mono text-sm leading-relaxed mb-3">
          The server hit an unhandled error. The team's been notified by Vercel
          logs. You can retry the page or head home.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-ink/60 mb-6">
            REQUEST ID · <code>{error.digest}</code>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => reset()}
            className="bg-ink text-hazard spec-label font-bold px-4 py-2 border border-ink hover:bg-bone hover:text-ink"
          >
            RETRY →
          </button>
          <Link
            href="/"
            className="border border-ink spec-label font-bold px-4 py-2 hover:bg-ink hover:text-hazard"
          >
            HOME
          </Link>
        </div>
      </SpecCard>
    </main>
  );
}
