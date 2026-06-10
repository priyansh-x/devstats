"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const sendMagicLink = () =>
    start(async () => {
      setMsg(null);
      const sb = createSupabaseBrowser();
      if (!sb) return setMsg("ERROR: Supabase client unavailable");
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard`,
        },
      });
      setMsg(error ? `ERROR: ${error.message}` : "CHECK YOUR INBOX →");
    });

  const signInGithub = () =>
    start(async () => {
      setMsg(null);
      const sb = createSupabaseBrowser();
      if (!sb) return setMsg("ERROR: Supabase client unavailable");
      const { error } = await sb.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) setMsg(`ERROR: ${error.message}`);
    });

  return (
    <div className="space-y-5 font-mono text-sm">
      <button
        type="button"
        onClick={signInGithub}
        disabled={pending}
        className="w-full bg-ink text-hazard spec-label font-bold py-3 border border-ink hover:bg-hazard hover:text-ink transition-colors disabled:opacity-50"
      >
        CONTINUE WITH GITHUB →
      </button>

      <div className="flex items-center gap-3 text-ink/40">
        <div className="flex-1 h-px bg-ink/20" />
        <span className="spec-label">OR</span>
        <div className="flex-1 h-px bg-ink/20" />
      </div>

      <div className="space-y-2">
        <label className="spec-label text-ink/60 block">EMAIL</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="operator@domain.com"
          className="w-full bg-bone border border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-bone-soft"
        />
        <button
          type="button"
          onClick={sendMagicLink}
          disabled={pending || !email}
          className="w-full border border-ink spec-label font-bold py-2 hover:bg-ink hover:text-hazard transition-colors disabled:opacity-50"
        >
          SEND MAGIC LINK
        </button>
      </div>

      {msg && (
        <div className="spec-label text-ink/70 border-l-2 border-hazard pl-3">
          {msg}
        </div>
      )}
    </div>
  );
}
