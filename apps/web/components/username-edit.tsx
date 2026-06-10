"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function UsernameEdit({ initialUsername }: { initialUsername: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialUsername);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setErr(null);
      setOk(null);
      const res = await fetch("/api/user/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? "could not update");
        return;
      }
      setOk(`HANDLE → ${json.username}`);
      setEditing(false);
      router.refresh();
    });

  if (!editing) {
    return (
      <div className="flex items-center justify-between font-mono text-sm">
        <div>
          <span className="spec-label text-ink/60 mr-2">CURRENT</span>
          <span className="font-bold">{initialUsername}</span>
        </div>
        <button
          onClick={() => { setEditing(true); setValue(initialUsername); setErr(null); setOk(null); }}
          className="border border-ink spec-label font-bold px-3 py-1 hover:bg-ink hover:text-hazard"
        >
          CHANGE →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono text-sm">
      <label className="block">
        <span className="spec-label text-ink/60">NEW HANDLE</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="3–24 chars · letters, digits, _ or -"
          className="block w-full mt-1 bg-bone border border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-bone-soft"
          maxLength={24}
        />
        <span className="block mt-1 text-xs text-ink/50">
          Profile URL will become <code className="bg-bone-soft px-1">/u/{value || "<handle>"}</code>
        </span>
      </label>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending || value === initialUsername || value.length < 3}
          className="bg-ink text-hazard spec-label font-bold px-4 py-2 border border-ink hover:bg-hazard hover:text-ink disabled:opacity-30"
        >
          {pending ? "SAVING…" : "SAVE"}
        </button>
        <button
          onClick={() => { setEditing(false); setErr(null); }}
          disabled={pending}
          className="border border-ink spec-label font-bold px-4 py-2 hover:bg-ink hover:text-hazard"
        >
          CANCEL
        </button>
      </div>
      {err && <p className="text-xs text-hazard font-bold">ERROR · {err}</p>}
      {ok && <p className="text-xs text-ink/70 border-l-2 border-hazard pl-2">{ok}</p>}
    </div>
  );
}
