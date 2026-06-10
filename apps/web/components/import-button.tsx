"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function safeJson(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}

export function ImportLocalButton({ reset = false, label }: { reset?: boolean; label?: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const url = `/api/sessions/import-local${reset ? "?reset=1" : ""}`;
            const res = await fetch(url, { method: "POST" });
            const text = await res.text();
            const json = text ? safeJson(text) : {};
            if (!res.ok) {
              setMsg(`ERROR ${res.status}: ${json?.error ?? text.slice(0, 120) ?? "import failed"}`);
              return;
            }
            setMsg(
              `${reset ? "REBUILT" : "IMPORTED"} ${json.inserted} / ${json.parsed} PARSED${
                json.warnings?.length ? ` · ${json.warnings.length} WARNINGS` : ""
              }`,
            );
            router.refresh();
          })
        }
        className="bg-ink text-hazard spec-label font-bold px-4 py-2 border border-ink hover:bg-hazard hover:text-ink disabled:opacity-50"
      >
        {pending
          ? (reset ? "REBUILDING…" : "PARSING…")
          : (label ?? "IMPORT FROM ~/.CLAUDE →")}
      </button>
      {msg && <span className="spec-label text-ink/70">{msg}</span>}
    </div>
  );
}
