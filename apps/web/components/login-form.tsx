"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

/**
 * GitHub-first login. Magic links exist in the SDK but Supabase's built-in
 * email sender is rate-limited to ~3/hour/project on the free tier, so we
 * keep it tucked away as a fallback only.
 */
export function LoginForm() {
  const [busy, start] = useTransition();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const signInGithub = () =>
    start(async () => {
      setMsg(null);
      const sb = createSupabaseBrowser();
      if (!sb) return setMsg("Supabase client unavailable. Check env vars.");
      const { error } = await sb.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: `${location.origin}/auth/callback?next=/dashboard` },
      });
      if (error) setMsg(error.message);
    });

  const sendMagicLink = () =>
    start(async () => {
      setMsg(null);
      const sb = createSupabaseBrowser();
      if (!sb) return setMsg("Supabase client unavailable.");
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard` },
      });
      setMsg(error ? error.message : "Check your inbox.");
    });

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={signInGithub}
        disabled={busy}
        className="w-full bg-ink text-bone font-bold py-3 px-4 border border-ink hover:bg-hazard hover:text-ink transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
      >
        <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        {busy ? "Redirecting…" : "Continue with GitHub"}
      </button>

      <p className="text-xs text-ink/60 text-center">
        We only request your public profile and email. No repo access, no writes.
      </p>

      {!showEmail ? (
        <button
          type="button"
          onClick={() => setShowEmail(true)}
          className="block w-full text-center text-xs text-ink/50 hover:text-ink underline"
        >
          email magic link (slow — rate-limited)
        </button>
      ) : (
        <div className="border-t border-ink/20 pt-4 space-y-2">
          <label className="block text-xs text-ink/60">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-bone border border-ink px-3 py-2 text-sm focus:outline-none focus:bg-bone-soft"
          />
          <button
            type="button"
            onClick={sendMagicLink}
            disabled={busy || !email}
            className="w-full border border-ink font-bold py-2 text-sm hover:bg-ink hover:text-bone transition-colors disabled:opacity-30"
          >
            {busy ? "Sending…" : "Send magic link"}
          </button>
          <p className="text-[11px] text-ink/50">
            Free Supabase tier allows ~3 emails per hour total across the project.
            GitHub is faster and more reliable.
          </p>
        </div>
      )}

      {msg && (
        <div className="text-sm text-hazard border-l-2 border-hazard pl-3">
          {msg}
        </div>
      )}
    </div>
  );
}
