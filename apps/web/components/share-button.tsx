"use client";

import { useState } from "react";

export function ShareButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const url = `${location.origin}/u/${username}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tweet = () => {
    const url = `${location.origin}/u/${username}`;
    const text = `My DevStats spec sheet:`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
    );
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={copy}
        className="bg-ink text-hazard spec-label font-bold px-3 py-1 border border-ink hover:bg-bone hover:text-ink"
      >
        {copied ? "COPIED" : "COPY URL"}
      </button>
      <button
        onClick={tweet}
        className="border border-ink spec-label font-bold px-3 py-1 hover:bg-ink hover:text-hazard"
      >
        SHARE →
      </button>
    </div>
  );
}
