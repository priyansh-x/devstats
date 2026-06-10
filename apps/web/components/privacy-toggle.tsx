"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "./badge";

export function PrivacyToggle({
  initialPublic,
  username,
}: {
  initialPublic: boolean;
  username: string;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [showModal, setShowModal] = useState(false);
  const [consent, setConsent] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const submit = (next: boolean, withConsent: boolean) =>
    start(async () => {
      setErr(null);
      const res = await fetch("/api/user/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next, consent: withConsent }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(`ERROR ${res.status}: ${json.error ?? "could not update"}`);
        return;
      }
      setIsPublic(next);
      setShowModal(false);
      setConsent(false);
      router.refresh();
    });

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <span className="spec-label text-ink/60">CURRENT STATUS</span>
          <div className="mt-1">
            <Badge variant={isPublic ? "hazard" : "outline"}>
              {isPublic ? "PUBLIC" : "PRIVATE"}
            </Badge>
          </div>
          {isPublic && (
            <p className="font-mono text-xs text-ink/60 mt-2">
              Profile is live at <code>/u/{username}</code> and counted on the leaderboard.
            </p>
          )}
        </div>
        {isPublic ? (
          <button
            onClick={() => submit(false, false)}
            disabled={pending}
            className="border border-ink spec-label font-bold px-4 py-2 hover:bg-ink hover:text-hazard disabled:opacity-50"
          >
            {pending ? "UPDATING…" : "MAKE PRIVATE →"}
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            disabled={pending}
            className="bg-ink text-hazard spec-label font-bold px-4 py-2 border border-ink hover:bg-hazard hover:text-ink disabled:opacity-50"
          >
            GO PUBLIC →
          </button>
        )}
      </div>

      {err && <p className="font-mono text-xs text-hazard mt-3">{err}</p>}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-bone border-2 border-ink">
            <div className="bg-ink text-hazard spec-label font-bold px-4 py-2">
              CONSENT / GO PUBLIC
            </div>
            <div className="p-5 space-y-4 font-mono text-sm">
              <p className="leading-relaxed">
                Going public means the following <b>aggregate</b> stats become
                visible to anyone with the URL:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-ink/80">
                <li>Your handle <b>{username}</b> on the public leaderboard</li>
                <li>Total tokens, sessions, duration, streak</li>
                <li>Tool and model breakdown (aggregate only)</li>
                <li>Daily activity heatmap by year</li>
              </ul>
              <p className="leading-relaxed">
                <b>Not shared:</b> session content, raw project names, real file paths,
                or any cost figures.
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 accent-hazard"
                />
                <span className="text-xs leading-relaxed">
                  I consent to my aggregated stats appearing on the public leaderboard
                  and my profile being accessible at <code>/u/{username}</code>. I can
                  revert to private at any time, which removes me from the leaderboard
                  and 404s the profile URL.
                </span>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setShowModal(false); setConsent(false); }}
                  className="border border-ink spec-label font-bold px-4 py-2 hover:bg-ink hover:text-hazard"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => submit(true, consent)}
                  disabled={!consent || pending}
                  className="bg-hazard text-ink spec-label font-bold px-4 py-2 border border-ink hover:bg-ink hover:text-hazard disabled:opacity-30"
                >
                  {pending ? "UPDATING…" : "CONFIRM PUBLIC →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
