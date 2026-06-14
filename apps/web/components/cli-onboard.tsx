"use client";

import { useState } from "react";
import { Badge } from "./badge";

/**
 * Linear, named, copy-pasteable walkthrough for "how do I get my <tool> data
 * into here?" — replaces the previous opaque 3-install-option block.
 *
 * Steps:
 *   1. Install the CLI (one recommended command, no choices)
 *   2. Log in (one command)
 *   3. Sync (one command — covers every supported tool at once)
 *
 * Each tool gets its own card so the user can see in plain English what
 * `devstats sync` will read from for them.
 */
export function CliOnboard() {
  return (
    <div className="space-y-6 font-mono text-sm">
      <Step n="01" title="INSTALL THE CLI">
        <p className="text-ink/70 mb-3">
          One command, globally available:
        </p>
        <Copy text={`npm i -g devstats-cli`} />
      </Step>

      <Step n="02" title="LOG IN WITH YOUR API KEY">
        <p className="text-ink/70 mb-3">
          Generate a key in the <b>API KEY / CLI ACCESS</b> card above, then:
        </p>
        <Copy text={`devstats login`} />
        <p className="text-ink/50 text-xs mt-3">
          Paste the key at the prompt. It's stored in{" "}
          <code className="bg-bone-soft px-1">~/.devstats/config.json</code> with{" "}
          <code className="bg-bone-soft px-1">0600</code> perms.
        </p>
      </Step>

      <Step n="03" title="PULL YOUR DATA">
        <p className="text-ink/70 mb-3">
          One command. Auto-detects every supported tool on your machine and uploads only what's new since last run.
        </p>
        <Copy text={`devstats sync`} />
        <p className="text-ink/50 text-xs mt-3">
          Want to see what it'd send first? Try <code className="bg-bone-soft px-1">devstats sync --dry-run</code>.
        </p>
      </Step>

      <Step n="04" title="CHECK YOUR DASHBOARD">
        <p className="text-ink/70 mb-3">
          Data lands instantly. Head to your dashboard or run it in the terminal:
        </p>
        <div className="space-y-2">
          <Copy text={`devstats dashboard`} />
        </div>
        <p className="text-ink/50 text-xs mt-3">
          Something off? Run <code className="bg-bone-soft px-1">devstats doctor</code> to diagnose.
        </p>
      </Step>

      <div className="border-t border-ink/20 pt-5">
        <div className="spec-label text-ink/60 mb-3">WHAT GETS READ</div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          <ToolRow
            name="CLAUDE CODE"
            path="~/.claude/projects/**/*.jsonl"
            note="Full token splits (input · output · cache read · cache create), models, 30-min gap session grouping."
          />
          <ToolRow
            name="CURSOR"
            path="state.vscdb (composerData + bubbleId)"
            note="One session per chat. Real createdAt / lastUpdatedAt timestamps. Tokens as Cursor reports them."
          />
          <ToolRow
            name="ANTIGRAVITY"
            path="state.vscdb (antigravity.notification.*)"
            note="Activity presence only — Google stores transcripts in the cloud. We capture one session per conversation; spend will read 0 until upstream exposes counts."
          />
          <ToolRow
            name="WINDSURF"
            path="state.vscdb (Cascade/Composer)"
            note="Codeium's Windsurf editor. Sessions with token counts from Cascade conversations."
          />
          <ToolRow
            name="CODEX"
            path="~/.codex/sessions/**/*.jsonl"
            note="OpenAI Codex CLI rollout logs. Token counts (input · cached · output), model names, per-session working directory."
          />
        </div>
        <p className="text-ink/50 text-xs mt-4">
          DevStats never uploads message content, real file paths, or repo URLs.
          Project names are SHA-256 hashed before they leave your machine.
        </p>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l-2 border-ink pl-4">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="spec-label text-hazard font-bold">{n}</span>
        <h3 className="font-display text-base font-black tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Copy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch">
      <pre className="flex-1 bg-ink text-hazard p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
        {text}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="bg-bone border-l-0 border border-ink spec-label font-bold px-3 hover:bg-ink hover:text-hazard"
      >
        {copied ? "✓" : "COPY"}
      </button>
    </div>
  );
}

function ToolRow({
  name,
  path,
  note,
}: {
  name: string;
  path: string;
  note: string;
}) {
  return (
    <div className="border border-ink/40 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="spec-label font-bold">{name}</span>
        <Badge variant="hazard">AUTO</Badge>
      </div>
      <code className="text-ink/60 text-[11px] break-all block">{path}</code>
      <p className="text-ink/70 text-xs mt-2 leading-relaxed">{note}</p>
    </div>
  );
}
