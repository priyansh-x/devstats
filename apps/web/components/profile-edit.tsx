"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ProfileEdit({
  initialBio,
  initialLocation,
}: {
  initialBio: string | null;
  initialLocation: string | null;
}) {
  const router = useRouter();
  const [bio, setBio] = useState(initialBio ?? "");
  const [location, setLocation] = useState(initialLocation ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const save = () =>
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio.trim() || null, location: location.trim() || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`Error: ${json.error ?? "could not save"}`);
        return;
      }
      setMsg("Saved.");
      router.refresh();
    });

  const dirty =
    (bio.trim() || null) !== (initialBio ?? null) ||
    (location.trim() || null) !== (initialLocation ?? null);

  return (
    <div className="space-y-4 text-sm">
      <label className="block">
        <span className="text-xs text-ink/60 uppercase tracking-wide">Location</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Mumbai, India"
          maxLength={80}
          className="block w-full mt-1 bg-bone border border-ink px-3 py-2 focus:outline-none focus:bg-bone-soft"
        />
        <span className="block mt-1 text-xs text-ink/50">
          Used for the location filter on the leaderboard. Free-form text, your call.
        </span>
      </label>
      <label className="block">
        <span className="text-xs text-ink/60 uppercase tracking-wide">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="One line about you."
          maxLength={160}
          rows={2}
          className="block w-full mt-1 bg-bone border border-ink px-3 py-2 font-mono focus:outline-none focus:bg-bone-soft resize-none"
        />
        <span className="block mt-1 text-xs text-ink/50">{160 - bio.length} characters left</span>
      </label>
      <button
        onClick={save}
        disabled={pending || !dirty}
        className="bg-ink text-bone font-bold px-4 py-2 border border-ink hover:bg-hazard hover:text-ink disabled:opacity-30 text-sm"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
      {msg && <p className="text-xs text-ink/70 border-l-2 border-hazard pl-2">{msg}</p>}
    </div>
  );
}
