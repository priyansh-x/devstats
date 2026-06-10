"use client";

import { useState, useTransition } from "react";
import { Badge } from "./badge";

export function ApiKeyCard({ hasKey }: { hasKey: boolean }) {
  const [pending, start] = useTransition();
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = () =>
    start(async () => {
      setCopied(false);
      const res = await fetch("/api/user/api-key", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert(`ERROR: ${json.error ?? "could not issue key"}`);
        return;
      }
      setIssued(json.apiKey);
    });

  const copy = () => {
    if (!issued) return;
    navigator.clipboard.writeText(issued).then(() => setCopied(true));
  };

  return (
    <div className="space-y-4 font-mono text-sm">
      <div className="flex items-center justify-between">
        <span className="spec-label text-ink/60">CURRENT KEY</span>
        <Badge variant={hasKey ? "hazard" : "outline"}>
          {hasKey ? "ACTIVE" : "NONE"}
        </Badge>
      </div>

      {issued ? (
        <div className="border border-ink bg-ink text-hazard p-3 break-all">
          <div className="spec-label text-bone/70 mb-1">COPY THIS NOW — IT WILL NOT BE SHOWN AGAIN</div>
          <code className="block text-xs leading-relaxed">{issued}</code>
        </div>
      ) : (
        <p className="text-ink/70 text-xs leading-relaxed">
          {hasKey
            ? "A key already exists. Generating a new one rotates the old one immediately — any CLI still using it will need to re-login."
            : "Generate a key, then paste it when the CLI prompts during `devstats login`."}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={generate}
          disabled={pending}
          className="bg-ink text-hazard spec-label font-bold px-4 py-2 border border-ink hover:bg-hazard hover:text-ink disabled:opacity-50"
        >
          {pending ? "ISSUING…" : hasKey ? "ROTATE KEY →" : "GENERATE KEY →"}
        </button>
        {issued && (
          <button
            onClick={copy}
            className="border border-ink spec-label font-bold px-4 py-2 hover:bg-ink hover:text-hazard"
          >
            {copied ? "COPIED" : "COPY"}
          </button>
        )}
      </div>
    </div>
  );
}
