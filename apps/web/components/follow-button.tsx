"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function FollowButton({
  username,
  initialFollowing,
  signedIn,
  isSelf,
}: {
  username: string;
  initialFollowing: boolean;
  signedIn: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, start] = useTransition();

  if (isSelf) {
    return (
      <span className="border border-ink/30 px-3 py-1.5 text-xs uppercase tracking-wide text-ink/60">
        That's you
      </span>
    );
  }
  if (!signedIn) {
    return (
      <a
        href={`/login`}
        className="bg-ink text-bone font-bold px-3 py-1.5 text-xs uppercase tracking-wide hover:bg-hazard hover:text-ink"
      >
        Sign in to follow
      </a>
    );
  }

  const toggle = () =>
    start(async () => {
      const method = following ? "DELETE" : "POST";
      const res = await fetch(`/api/friends/${username}`, { method });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.error ?? "could not update");
        return;
      }
      setFollowing(!!json.following);
      router.refresh();
    });

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`px-3 py-1.5 text-xs uppercase tracking-wide font-bold border border-ink transition-colors disabled:opacity-50 ${
        following
          ? "bg-bone hover:bg-hazard hover:text-ink"
          : "bg-hazard text-ink hover:bg-ink hover:text-bone"
      }`}
    >
      {pending ? "…" : following ? "Following ✓" : "+ Follow"}
    </button>
  );
}
