"use client";

import { useState, useCallback } from "react";

type Tab = "overview" | "users" | "sessions" | "live";

interface Overview {
  overview: {
    totalUsers: number; publicUsers: number; totalSessions: number;
    sessionsLastWeek: number; sessionsLastDay: number; totalSquads: number;
    activeUsersWeek: number; activeUsersDay: number;
  };
  byTool: { tool: string; users: number; sessions: number; tokens: number }[];
  topUsers: { username: string; isPublic: boolean; createdAt: string; sessions: number }[];
  recentSessions: {
    id: string; user: string; tool: string; startedAt: string;
    tokensIn: number | null; tokensOut: number | null; model: string | null;
  }[];
}

interface UserRow {
  id: string; username: string; email: string; avatarUrl: string | null;
  bio: string | null; location: string | null; countryCode: string | null;
  isPublic: boolean; createdAt: string; updatedAt: string;
  apiKeyIssuedAt: string | null; apiKeyLastUsedAt: string | null;
  sessions: number; following: number; followers: number; squads: number;
}

interface UserDetail {
  user: UserRow & { streak: { currentStreak: number; longestStreak: number } | null; squads: { name: string; slug: string }[] };
  toolBreakdown: { tool: string; sessions: number; tokensIn: number; tokensOut: number; durationMs: number }[];
  modelBreakdown: { model: string; sessions: number; tokens: number }[];
  recentSessions: { id: string; tool: string; model: string | null; startedAt: string; tokensIn: number | null; tokensOut: number | null; durationMs: number | null; projectSlug: string | null }[];
  dailyActivity: { date: string; sessions: number; tokens: number }[];
}

export default function DevConsole() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);

  const headers = useCallback(() => ({ "x-admin-password": pw }), [pw]);

  const api = useCallback(async (path: string) => {
    const res = await fetch(path, { headers: headers() });
    if (!res.ok) throw new Error(res.status === 401 ? "wrong password" : `${res.status}`);
    return res.json();
  }, [headers]);

  const login = async () => {
    setLoading(true); setError("");
    try {
      const data = await api("/api/dev/stats");
      setOverview(data); setAuthed(true);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadOverview = async () => {
    setLoading(true);
    try { setOverview(await api("/api/dev/stats")); }
    finally { setLoading(false); }
  };

  const searchUsers = async (q: string, page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, page: String(page) });
      const data = await api(`/api/dev/users?${params}`);
      setUsers(data.users); setUserTotal(data.total);
      setUserPage(data.page); setUserPages(data.pages);
    } finally { setLoading(false); }
  };

  const loadUser = async (id: string) => {
    setLoading(true);
    try { setSelectedUser(await api(`/api/dev/users/${id}`)); }
    finally { setLoading(false); }
  };

  // ── Login gate ──
  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bone font-mono">
        <form onSubmit={(e) => { e.preventDefault(); login(); }} className="border-2 border-ink p-8 space-y-4 max-w-sm w-full">
          <h1 className="font-display text-2xl font-black">DevStats /dev</h1>
          <p className="text-ink/60 text-sm">admin console.</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="password" className="w-full border border-ink p-2 bg-bone text-sm font-mono" autoFocus />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-ink text-hazard py-2 font-bold text-sm hover:bg-hazard hover:text-ink border border-ink transition-colors">
            {loading ? "..." : "ENTER"}
          </button>
        </form>
      </main>
    );
  }

  // ── Tabs ──
  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "OVERVIEW" },
    { key: "users", label: "USERS" },
    { key: "sessions", label: "SESSION FEED" },
  ];

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink pb-4 mb-6">
        <h1 className="font-display text-2xl font-black">DevStats /dev</h1>
        <button onClick={loadOverview}
          className="bg-ink text-hazard px-3 py-1 text-xs font-bold hover:bg-hazard hover:text-ink border border-ink transition-colors">
          REFRESH
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-ink/20 pb-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => {
            setTab(t.key); setSelectedUser(null);
            if (t.key === "users" && users.length === 0) searchUsers("");
          }}
            className={`px-3 py-1.5 text-xs font-bold tracking-wider transition-colors ${
              tab === t.key ? "bg-ink text-hazard" : "text-ink/60 hover:text-ink"
            }`}>
            {t.label}
          </button>
        ))}
        {loading && <span className="ml-auto text-ink/40 text-xs self-center">loading...</span>}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && overview && <OverviewTab data={overview} />}

      {/* ── USERS ── */}
      {tab === "users" && !selectedUser && (
        <UsersTab
          users={users} total={userTotal} page={userPage} pages={userPages}
          query={userQuery} onSearch={(q) => { setUserQuery(q); searchUsers(q); }}
          onPage={(p) => searchUsers(userQuery, p)}
          onSelect={(id) => loadUser(id)}
        />
      )}

      {/* ── USER DETAIL ── */}
      {tab === "users" && selectedUser && (
        <UserDetailView data={selectedUser} onBack={() => setSelectedUser(null)} />
      )}

      {/* ── SESSION FEED ── */}
      {tab === "sessions" && overview && <SessionFeed sessions={overview.recentSessions} />}
    </main>
  );
}

// ━━━━━━━━━━━━━━━━━━ OVERVIEW ━━━━━━━━━━━━━━━━━━

function OverviewTab({ data }: { data: Overview }) {
  const o = data.overview;
  return (
    <>
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

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="BY TOOL">
          <table className="w-full text-left">
            <thead><tr className="border-b border-ink text-ink/60 text-xs">
              <th className="pb-2">TOOL</th><th className="pb-2">USERS</th>
              <th className="pb-2">SESSIONS</th><th className="pb-2">TOKENS</th>
            </tr></thead>
            <tbody>{data.byTool.map((t) => (
              <tr key={t.tool} className="border-b border-ink/10">
                <td className="py-2 font-bold">{t.tool}</td>
                <td className="py-2">{t.users}</td>
                <td className="py-2">{t.sessions}</td>
                <td className="py-2">{fmt(t.tokens)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Section>

        <Section title="TOP USERS">
          <table className="w-full text-left">
            <thead><tr className="border-b border-ink text-ink/60 text-xs">
              <th className="pb-2">USER</th><th className="pb-2">SESSIONS</th>
              <th className="pb-2">PUBLIC</th><th className="pb-2">JOINED</th>
            </tr></thead>
            <tbody>{data.topUsers.map((u) => (
              <tr key={u.username} className="border-b border-ink/10">
                <td className="py-2 font-bold">{u.username}</td>
                <td className="py-2">{u.sessions}</td>
                <td className="py-2">{u.isPublic ? <span className="text-green-600">YES</span> : "NO"}</td>
                <td className="py-2 text-ink/60">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </Section>
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━ USERS ━━━━━━━━━━━━━━━━━━

function UsersTab({ users, total, page, pages, query, onSearch, onPage, onSelect }: {
  users: UserRow[]; total: number; page: number; pages: number; query: string;
  onSearch: (q: string) => void; onPage: (p: number) => void; onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState(query);
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <form onSubmit={(e) => { e.preventDefault(); onSearch(q); }} className="flex gap-2 flex-1">
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="search username, email, location..."
            className="flex-1 border border-ink p-2 bg-bone text-sm font-mono" />
          <button type="submit" className="bg-ink text-hazard px-4 py-2 text-xs font-bold border border-ink hover:bg-hazard hover:text-ink transition-colors">
            SEARCH
          </button>
        </form>
        <span className="text-ink/50 text-xs whitespace-nowrap">{total} users</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead><tr className="border-b border-ink text-ink/60 text-xs">
            <th className="pb-2">USER</th><th className="pb-2">EMAIL</th>
            <th className="pb-2">PUBLIC</th><th className="pb-2">SESSIONS</th>
            <th className="pb-2">FOLLOWERS</th><th className="pb-2">SQUADS</th>
            <th className="pb-2">API KEY</th><th className="pb-2">LAST SYNC</th>
            <th className="pb-2">JOINED</th>
          </tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ink/10 hover:bg-ink/5 cursor-pointer" onClick={() => onSelect(u.id)}>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    {u.avatarUrl && <img src={u.avatarUrl} className="w-5 h-5 border border-ink" alt="" />}
                    <span className="font-bold">{u.username}</span>
                    {u.countryCode && <span className="text-xs">{flag(u.countryCode)}</span>}
                  </div>
                </td>
                <td className="py-2 text-ink/60">{u.email}</td>
                <td className="py-2">{u.isPublic ? <span className="text-green-600 font-bold">YES</span> : <span className="text-ink/40">NO</span>}</td>
                <td className="py-2 tabular-nums">{u.sessions}</td>
                <td className="py-2 tabular-nums">{u.followers}</td>
                <td className="py-2 tabular-nums">{u.squads}</td>
                <td className="py-2">{u.apiKeyIssuedAt ? <span className="text-green-600">active</span> : <span className="text-ink/30">none</span>}</td>
                <td className="py-2 text-ink/60">{u.apiKeyLastUsedAt ? timeAgo(u.apiKeyLastUsedAt) : "—"}</td>
                <td className="py-2 text-ink/60">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => onPage(page - 1)}
            className="px-3 py-1 border border-ink text-xs font-bold disabled:opacity-30 hover:bg-ink hover:text-bone transition-colors">
            ← PREV
          </button>
          <span className="text-xs text-ink/60">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => onPage(page + 1)}
            className="px-3 py-1 border border-ink text-xs font-bold disabled:opacity-30 hover:bg-ink hover:text-bone transition-colors">
            NEXT →
          </button>
        </div>
      )}
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━ USER DETAIL ━━━━━━━━━━━━━━━━━━

function UserDetailView({ data, onBack }: { data: UserDetail; onBack: () => void }) {
  const u = data.user;
  return (
    <>
      <button onClick={onBack} className="text-xs text-ink/60 hover:text-ink mb-4">← BACK TO LIST</button>

      {/* Profile header */}
      <div className="border border-ink p-5 mb-6">
        <div className="flex items-start gap-4">
          {u.avatarUrl && <img src={u.avatarUrl} className="w-14 h-14 border border-ink" alt="" />}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-black">{u.username}</h2>
              {u.isPublic ? <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 font-bold">PUBLIC</span>
                : <span className="text-[10px] bg-ink/10 text-ink/60 px-1.5 py-0.5 font-bold">PRIVATE</span>}
              {u.countryCode && <span>{flag(u.countryCode)}</span>}
            </div>
            <p className="text-ink/60 text-xs mt-1">{u.email}</p>
            {u.bio && <p className="text-ink/70 text-xs mt-1">{u.bio}</p>}
            {u.location && <p className="text-ink/50 text-xs mt-1">{u.location}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-5 pt-4 border-t border-ink/20">
          <MiniKpi label="Sessions" value={u.sessions} />
          <MiniKpi label="Following" value={u.following} />
          <MiniKpi label="Followers" value={u.followers} />
          <MiniKpi label="Streak" value={u.streak?.currentStreak ?? 0} unit="d" />
          <MiniKpi label="Best streak" value={u.streak?.longestStreak ?? 0} unit="d" />
          <MiniKpi label="Squads" value={u.squads.length} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-ink/20 text-xs text-ink/60">
          <div>Joined: <b className="text-ink">{new Date(u.createdAt).toLocaleDateString()}</b></div>
          <div>Updated: <b className="text-ink">{new Date(u.updatedAt).toLocaleDateString()}</b></div>
          <div>API key: <b className="text-ink">{u.apiKeyIssuedAt ? timeAgo(u.apiKeyIssuedAt) : "none"}</b></div>
          <div>Last sync: <b className="text-ink">{u.apiKeyLastUsedAt ? timeAgo(u.apiKeyLastUsedAt) : "never"}</b></div>
        </div>

        {u.squads.length > 0 && (
          <div className="mt-4 pt-4 border-t border-ink/20">
            <span className="text-xs text-ink/50 mr-2">SQUADS:</span>
            {u.squads.map((s) => (
              <span key={s.slug} className="inline-block bg-ink/10 text-xs px-2 py-0.5 mr-1">{s.name}</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Tools */}
        <Section title="TOOL BREAKDOWN">
          <table className="w-full text-left">
            <thead><tr className="border-b border-ink text-ink/60 text-xs">
              <th className="pb-2">TOOL</th><th className="pb-2">SESSIONS</th>
              <th className="pb-2">TOKENS IN</th><th className="pb-2">TOKENS OUT</th>
              <th className="pb-2">DURATION</th>
            </tr></thead>
            <tbody>{data.toolBreakdown.map((t) => (
              <tr key={t.tool} className="border-b border-ink/10">
                <td className="py-2 font-bold">{t.tool}</td>
                <td className="py-2">{t.sessions}</td>
                <td className="py-2 tabular-nums">{fmt(t.tokensIn)}</td>
                <td className="py-2 tabular-nums">{fmt(t.tokensOut)}</td>
                <td className="py-2 tabular-nums">{durFmt(t.durationMs)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Section>

        {/* Models */}
        <Section title="TOP MODELS">
          <table className="w-full text-left">
            <thead><tr className="border-b border-ink text-ink/60 text-xs">
              <th className="pb-2">MODEL</th><th className="pb-2">SESSIONS</th>
              <th className="pb-2">TOKENS</th>
            </tr></thead>
            <tbody>{data.modelBreakdown.map((m) => (
              <tr key={m.model} className="border-b border-ink/10">
                <td className="py-2 font-bold">{m.model}</td>
                <td className="py-2">{m.sessions}</td>
                <td className="py-2 tabular-nums">{fmt(m.tokens)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Section>
      </div>

      {/* Daily activity */}
      {data.dailyActivity.length > 0 && (
        <Section title="DAILY ACTIVITY (LAST 30 DAYS)">
          <div className="flex items-end gap-[2px] h-24">
            {data.dailyActivity.slice().reverse().map((d) => {
              const maxT = Math.max(1, ...data.dailyActivity.map((x) => x.tokens));
              const h = Math.max(4, (d.tokens / maxT) * 100);
              return (
                <div key={d.date} className="flex-1 group relative">
                  <div className="bg-hazard border border-ink/10 w-full transition-all hover:border-ink"
                    style={{ height: `${h}%` }} title={`${d.date}: ${d.sessions} sessions, ${fmt(d.tokens)} tkn`} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-ink/40 mt-1">
            <span>{data.dailyActivity[data.dailyActivity.length - 1]?.date.toString().slice(5)}</span>
            <span>{data.dailyActivity[0]?.date.toString().slice(5)}</span>
          </div>
        </Section>
      )}

      {/* Recent sessions */}
      <Section title="RECENT SESSIONS">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead><tr className="border-b border-ink text-ink/60 text-xs">
              <th className="pb-2">TOOL</th><th className="pb-2">MODEL</th>
              <th className="pb-2">IN</th><th className="pb-2">OUT</th>
              <th className="pb-2">DURATION</th><th className="pb-2">PROJECT</th>
              <th className="pb-2">WHEN</th>
            </tr></thead>
            <tbody>{data.recentSessions.map((s) => (
              <tr key={s.id} className="border-b border-ink/10">
                <td className="py-2 font-bold">{s.tool}</td>
                <td className="py-2 text-ink/60">{s.model ?? "—"}</td>
                <td className="py-2 tabular-nums">{s.tokensIn?.toLocaleString() ?? "—"}</td>
                <td className="py-2 tabular-nums">{s.tokensOut?.toLocaleString() ?? "—"}</td>
                <td className="py-2 tabular-nums">{s.durationMs ? durFmt(s.durationMs) : "—"}</td>
                <td className="py-2 text-ink/50 max-w-[120px] truncate">{s.projectSlug ?? "—"}</td>
                <td className="py-2 text-ink/60">{timeAgo(s.startedAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━ SESSION FEED ━━━━━━━━━━━━━━━━━━

function SessionFeed({ sessions }: { sessions: Overview["recentSessions"] }) {
  return (
    <Section title="LIVE SESSION FEED (LAST 20)">
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-3 border border-ink/10 px-4 py-3 hover:border-ink/30 transition-colors">
            <span className="w-2 h-2 bg-hazard border border-ink shrink-0" />
            <span className="font-bold">{s.user}</span>
            <span className="text-ink/50">·</span>
            <span className="text-ink/70">{s.tool}</span>
            <span className="text-ink/50">·</span>
            <span className="text-ink/50">{s.model ?? "unknown"}</span>
            <span className="ml-auto tabular-nums text-ink/60">
              {s.tokensIn ? `${fmt(s.tokensIn)} in` : ""}{s.tokensOut ? ` · ${fmt(s.tokensOut)} out` : ""}
            </span>
            <span className="text-ink/40 text-xs">{timeAgo(s.startedAt)}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ━━━━━━━━━━━━━━━━━━ SHARED ━━━━━━━━━━━━━━━━━━

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink p-4">
      <div className="text-ink/60 text-[10px] tracking-wider mb-1">{label}</div>
      <div className="font-display text-2xl font-black">{value.toLocaleString()}</div>
    </div>
  );
}

function MiniKpi({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div>
      <div className="text-ink/50 text-[10px] tracking-wider">{label}</div>
      <div className="font-display text-lg font-black tabular-nums">{value}{unit && <span className="text-xs font-normal text-ink/50 ml-0.5">{unit}</span>}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-sm font-black mb-3 text-ink/70 tracking-wider">{title}</h2>
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

function durFmt(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
}

function flag(cc: string) {
  return cc.replace(/./g, (c) => String.fromCodePoint(0x1f1e6 - 65 + c.toUpperCase().charCodeAt(0)));
}
