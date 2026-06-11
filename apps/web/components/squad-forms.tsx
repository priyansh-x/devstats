"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SquadForms() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(`Error: ${json.error ?? "could not create"}`);
      router.push(`/squads/${json.slug}`);
    });

  const join = () =>
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/squads/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(`Error: ${json.error ?? "could not join"}`);
      router.push(`/squads/${json.slug}`);
    });

  return (
    <div className="grid md:grid-cols-2 gap-5 text-sm">
      <div className="border border-ink p-4 space-y-3">
        <div className="font-bold">Create a squad</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. backend goblins"
          maxLength={40}
          className="w-full bg-bone border border-ink px-3 py-2 focus:outline-none focus:bg-bone-soft"
        />
        <button
          onClick={create}
          disabled={pending || name.trim().length < 3}
          className="bg-ink text-bone font-bold px-4 py-2 border border-ink hover:bg-hazard hover:text-ink disabled:opacity-30 w-full"
        >
          {pending ? "…" : "Create →"}
        </button>
      </div>
      <div className="border border-ink p-4 space-y-3">
        <div className="font-bold">Join with a code</div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. K7M2XQ9R"
          maxLength={12}
          className="w-full bg-bone border border-ink px-3 py-2 font-mono tracking-widest focus:outline-none focus:bg-bone-soft"
        />
        <button
          onClick={join}
          disabled={pending || code.trim().length < 4}
          className="border border-ink font-bold px-4 py-2 hover:bg-ink hover:text-bone disabled:opacity-30 w-full"
        >
          {pending ? "…" : "Join →"}
        </button>
      </div>
      {msg && <p className="md:col-span-2 text-xs text-hazard font-bold">{msg}</p>}
    </div>
  );
}

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title="Copy invite code"
      className="font-mono tracking-widest border border-ink px-3 py-1 text-sm hover:bg-ink hover:text-bone"
    >
      {copied ? "Copied ✓" : code}
    </button>
  );
}

export function LeaveSquadButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          if (!window.confirm("Leave this squad?")) return;
          await fetch(`/api/squads/${slug}`, { method: "DELETE" });
          router.push("/squads");
          router.refresh();
        })
      }
      disabled={pending}
      className="text-xs uppercase tracking-wide font-bold border border-ink px-3 py-1 hover:bg-hazard hover:text-ink disabled:opacity-50"
    >
      {pending ? "…" : "Leave"}
    </button>
  );
}
