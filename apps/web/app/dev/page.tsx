"use client";

import { useState, useEffect, useCallback } from "react";

interface Stats {
  overview: {
    totalUsers: number;
    publicUsers: number;
    totalSessions: number;
    sessionsLastWeek: number;
    sessionsLastDay: number;
    totalSquads: number;
    activeUsersWeek: number;
    activeUsersDay: number;
  };
  byTool: { tool: string; users: number; sessions: number; tokens: number }[];
  topUsers: { username: string; isPublic: boolean; createdAt: string; sessions: number }[];
  recentSessions: {
    id: string;
    user: string;
    tool: string;
    startedAt: string;
    tokensIn: number | null;
    tokensOut: number | null;
    model: string | null;
  }[];
}

export default function DevDashboard() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (password: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dev/stats", {
        headers: { "x-admin-password": password },
      });
      if (!res.ok) throw new Error(res.status === 401 ? "wrong password" : "fetch failed");
      setStats(await res.json());
      setAuthed(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = () => load(pw);

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bone font-mono">
        <form
          onSubmit={(e) => { e.preventDefault(); load(pw); }}
          className="border-2 border-ink p-8 space-y-4 max-w-sm w-full"
        >
          <h1 className="font-display text-2xl font-black">devstats /dev</h1>
          <p className="text-ink/60 text-sm">admin access only.</p>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="password"
            className="w-full border border-ink p-2 bg-bone text-sm font-mono"
            autoFocus
          />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-hazard py-2 font-bold text-sm hover:bg-hazard hover:text-ink border border-ink transition-colors"
          >
            {loading ? "..." : "ENTER"}
          </button>
        </form>
      </main>
    );
  }

  const o = stats!.overview;

  return (
    <main className="max-w-6xl mx-auto px-6 py-8 font-mono text-sm">
      <div className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <h1 className="font-display text-3xl font-black">devstats /dev</h1>
        <button
          onClick={refresh}
          className="bg-ink text-hazard px-3 py-1 text-xs font-bold hover:bg-hazard hover:text-ink border border-ink transition-colors"
        >
          REFRESH
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Kpi label="TOTAL USERS" value={o.totalUsers} />
        <Kpi label="PUBLIC" value={o.publicUsers} />
        <Kpi label="ACTIVE (7D)" value={o.activeUsersWeek} />
        <Kpi label="ACTIVE (24H)" value={o.activeUsersDay} />
        <Kpi label="TOTAL SESSIONS" value={o.totalSessions} />
        <Kpi label="SESSIONS (7D)" value={o.sessionsLastWeek} />
        <Kpi label="SESSIONS (24H)" value={o.sessionsLastDay} />
        <Kpi label="SQUADS" value={o.totalSquads} />
      </div>

      {/* By tool */}
      <Section title="BY TOOL">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-ink text-ink/60 text-xs">
              <th className="pb-2">TOOL</th>
              <th className="pb-2">USERS</th>
              <th className="pb-2">SESSIONS</th>
              <th className="pb-2">TOKENS</th>
            </tr>
          </thead>
          <tbody>
            {stats!.byTool.map((t) => (
              <tr key={t.tool} className="border-b border-ink/10">
                <td className="py-2 font-bold">{t.tool}</td>
                <td className="py-2">{t.users}</td>
                <td className="py-2">{t.sessions}</td>
                <td className="py-2">{fmt(t.tokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Top users */}
      <Section title="TOP USERS (BY SESSION COUNT)">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-ink text-ink/60 text-xs">
              <th className="pb-2">USER</th>
              <th className="pb-2">SESSIONS</th>
              <th className="pb-2">PUBLIC</th>
              <th className="pb-2">JOINED</th>
            </tr>
          </thead>
          <tbody>
            {stats!.topUsers.map((u) => (
              <tr key={u.username} className="border-b border-ink/10">
                <td className="py-2 font-bold">{u.username}</td>
                <td className="py-2">{u.sessions}</td>
                <td className="py-2">{u.isPublic ? "YES" : "NO"}</td>
                <td className="py-2 text-ink/60">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Recent sessions */}
      <Section title="RECENT SESSIONS">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-ink text-ink/60 text-xs">
                <th className="pb-2">USER</th>
                <th className="pb-2">TOOL</th>
                <th className="pb-2">MODEL</th>
                <th className="pb-2">IN</th>
                <th className="pb-2">OUT</th>
                <th className="pb-2">WHEN</th>
              </tr>
            </thead>
            <tbody>
              {stats!.recentSessions.map((s) => (
                <tr key={s.id} className="border-b border-ink/10">
                  <td className="py-2 font-bold">{s.user}</td>
                  <td className="py-2">{s.tool}</td>
                  <td className="py-2 text-ink/60">{s.model ?? "—"}</td>
                  <td className="py-2 tabular-nums">{s.tokensIn?.toLocaleString() ?? "—"}</td>
                  <td className="py-2 tabular-nums">{s.tokensOut?.toLocaleString() ?? "—"}</td>
                  <td className="py-2 text-ink/60">{timeAgo(s.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink p-4">
      <div className="text-ink/60 text-[10px] tracking-wider mb-1">{label}</div>
      <div className="font-display text-2xl font-black">{value.toLocaleString()}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-lg font-black mb-3">{title}</h2>
      {children}
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
