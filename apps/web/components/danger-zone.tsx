"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const TOOLS = ["CLAUDE_CODE", "CURSOR", "ANTIGRAVITY", "WINDSURF", "COPILOT", "CODEX", "MANUAL"];

export function DangerZone({ username }: { username: string }) {
  const router = useRouter();
  const [tool, setTool] = useState("ALL");
  const [confirmHandle, setConfirmHandle] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const wipeTool = () =>
    start(async () => {
      setMsg(null);
      const label = tool === "ALL" ? "ALL your session data" : `all ${tool.replace("_", " ")} sessions`;
      if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
      const res = await fetch(`/api/user/data?tool=${tool}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`Error: ${json.error ?? "could not delete"}`);
        return;
      }
      setMsg(`Deleted ${json.deleted} sessions (${tool === "ALL" ? "all tools" : tool}).`);
      router.refresh();
    });

  const deleteAccount = () =>
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmUsername: confirmHandle }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`Error: ${json.error ?? "could not delete account"}`);
        return;
      }
      // Best-effort local sign-out, then leave.
      const sb = createSupabaseBrowser();
      if (sb) await sb.auth.signOut().catch(() => {});
      window.location.href = "/";
    });

  return (
    <div className="space-y-6 text-sm">
      {/* Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="font-bold">Export your data</div>
          <p className="text-xs text-ink/60 mt-0.5">
            Everything we hold: profile, sessions, streak, follow graph.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href="/api/user/export"
            className="border border-ink font-bold px-4 py-2 hover:bg-ink hover:text-bone text-sm text-center"
          >
            JSON
          </a>
          <a
            href="/api/user/export-csv"
            className="border border-ink font-bold px-4 py-2 hover:bg-ink hover:text-bone text-sm text-center"
          >
            CSV
          </a>
        </div>
      </div>

      <div className="border-t border-ink/20" />

      {/* Per-tool wipe */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="font-bold">Delete session data</div>
          <p className="text-xs text-ink/60 mt-0.5">
            Wipe one tool's sessions (e.g. after a bad import) or everything. Profile stays.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <select
            value={tool}
            onChange={(e) => setTool(e.target.value)}
            className="bg-bone border border-ink px-2 py-2 text-sm focus:outline-none"
          >
            <option value="ALL">All tools</option>
            {TOOLS.map((t) => (
              <option key={t} value={t}>{t.replace("_", " ")}</option>
            ))}
          </select>
          <button
            onClick={wipeTool}
            disabled={pending}
            className="border border-hazard text-hazard font-bold px-4 py-2 hover:bg-hazard hover:text-ink text-sm disabled:opacity-50"
          >
            {pending ? "…" : "Delete"}
          </button>
        </div>
      </div>

      <div className="border-t border-ink/20" />

      {/* Account deletion */}
      <div>
        <div className="font-bold text-hazard">Delete account</div>
        <p className="text-xs text-ink/60 mt-0.5 mb-3">
          Removes your profile, every session, streaks, leaderboard entries, and
          follows. Irreversible. Type <b>{username}</b> to confirm.
        </p>
        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="border border-hazard text-hazard font-bold px-4 py-2 hover:bg-hazard hover:text-ink text-sm"
          >
            I want to delete my account
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={confirmHandle}
              onChange={(e) => setConfirmHandle(e.target.value)}
              placeholder={`Type "${username}" to confirm`}
              className="bg-bone border border-ink px-3 py-2 text-sm focus:outline-none focus:bg-bone-soft flex-1"
            />
            <button
              onClick={deleteAccount}
              disabled={pending || confirmHandle !== username}
              className="bg-hazard text-ink font-bold px-4 py-2 border border-ink hover:bg-ink hover:text-hazard text-sm disabled:opacity-30"
            >
              {pending ? "Deleting…" : "Delete forever"}
            </button>
            <button
              onClick={() => { setShowDelete(false); setConfirmHandle(""); }}
              className="border border-ink font-bold px-4 py-2 hover:bg-ink hover:text-bone text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {msg && <p className="text-xs text-ink/70 border-l-2 border-hazard pl-2">{msg}</p>}
    </div>
  );
}
