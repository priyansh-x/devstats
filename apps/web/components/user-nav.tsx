"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Profile pill in the header. Click → dropdown with avatar/initials, handle,
 * and the standard nav (dashboard, public profile, settings, sign out).
 */
export function UserNav({
  user,
}: {
  user: { username: string; isPublic: boolean; avatarUrl: string | null };
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const signOut = async () => {
    const sb = createSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={wrap}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-ink px-2 py-1 hover:bg-ink hover:text-bone"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="w-6 h-6 object-cover border border-ink" />
        ) : (
          <span className="w-6 h-6 bg-hazard text-ink text-[10px] font-bold flex items-center justify-center border border-ink">
            {initials}
          </span>
        )}
        <span className="font-bold text-sm">{user.username}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" className={open ? "rotate-180" : ""}>
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-bone border border-ink shadow-[4px_4px_0_0_#0A0A0A] z-20">
          <div className="px-3 py-2 border-b border-ink/20">
            <div className="text-xs text-ink/60">Signed in as</div>
            <div className="font-bold">{user.username}</div>
          </div>
          <NavItem href="/dashboard" onClose={() => setOpen(false)}>Dashboard</NavItem>
          {user.isPublic && (
            <NavItem href={`/u/${user.username}`} onClose={() => setOpen(false)}>
              View public profile
            </NavItem>
          )}
          <NavItem href="/leaderboard" onClose={() => setOpen(false)}>Leaderboard</NavItem>
          <NavItem href="/settings" onClose={() => setOpen(false)}>Settings</NavItem>
          <div className="border-t border-ink/20" />
          <button
            onClick={signOut}
            className="block w-full text-left px-3 py-2 text-sm hover:bg-ink hover:text-bone"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function NavItem({
  href, children, onClose,
}: {
  href: string; children: React.ReactNode; onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="block px-3 py-2 text-sm hover:bg-ink hover:text-bone"
    >
      {children}
    </Link>
  );
}
