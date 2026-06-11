"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { SpecCard } from "./spec-card";
import { Badge } from "./badge";
import type { LbRow, LbPeriod, LbMetric } from "@/lib/leaderboard";
import { fmtCompact, fmtDuration } from "@/lib/utils";
import { COUNTRIES, countryName, flagEmoji } from "@/lib/countries";

const PERIODS: { v: LbPeriod; label: string }[] = [
  { v: "daily",   label: "Today" },
  { v: "weekly",  label: "This week" },
  { v: "monthly", label: "This month" },
  { v: "alltime", label: "All time" },
];
const METRICS: { v: LbMetric; label: string }[] = [
  { v: "tokens",   label: "Tokens" },
  { v: "sessions", label: "Sessions" },
  { v: "duration", label: "Duration" },
  { v: "lines",    label: "Lines" },
];

export function LeaderboardClient({
  initialRows,
  signedIn,
  myUsername,
}: {
  initialRows: LbRow[];
  signedIn: boolean;
  myUsername: string | null;
}) {
  const [period, setPeriod]   = useState<LbPeriod>("weekly");
  const [metric, setMetric]   = useState<LbMetric>("tokens");
  const [q, setQ]             = useState("");
  const [country, setCountry] = useState("");
  const [friendsOnly, setFO]  = useState(false);
  const [rows, setRows]       = useState<LbRow[]>(initialRows);
  const [pending, start]      = useTransition();
  const [firstLoad, setFirst] = useState(true);

  useEffect(() => {
    if (firstLoad) { setFirst(false); return; }
    const t = setTimeout(() => {
      start(async () => {
        const sp = new URLSearchParams({
          period, metric,
          ...(q ? { q } : {}),
          ...(country ? { country } : {}),
          ...(friendsOnly ? { friendsOnly: "1" } : {}),
        });
        const res = await fetch(`/api/leaderboard?${sp.toString()}`);
        const json = await res.json();
        setRows(json.rows ?? []);
      });
    }, 180); // light debounce on text inputs
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, metric, q, country, friendsOnly]);

  const fmtScore = (n: number) =>
    metric === "duration" ? fmtDuration(n) : fmtCompact(n);

  const meta = useMemo(() => {
    const parts = [PERIODS.find((p) => p.v === period)?.label, METRICS.find((m) => m.v === metric)?.label];
    if (friendsOnly) parts.push("friends only");
    if (country) parts.push(`${flagEmoji(country)} ${countryName(country)}`);
    return parts.filter(Boolean).join(" · ");
  }, [period, metric, friendsOnly, country]);

  return (
    <SpecCard label="Standings" meta={meta}>
      {/* Period + metric toggle row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Toggle options={PERIODS} value={period} onChange={setPeriod} />
        <Toggle options={METRICS} value={metric} onChange={setMetric} />
        {signedIn && (
          <button
            onClick={() => setFO((v) => !v)}
            className={`text-xs uppercase tracking-wide font-bold px-3 py-1 border border-ink transition-colors ${
              friendsOnly ? "bg-hazard text-ink" : "bg-bone hover:bg-ink/10"
            }`}
            title="Show only people you follow"
          >
            {friendsOnly ? "Friends only ✓" : "Friends only"}
          </button>
        )}
      </div>

      {/* Search + country filter */}
      <div className="grid sm:grid-cols-2 gap-2 mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username…"
          className="bg-bone border border-ink px-3 py-2 text-sm focus:outline-none focus:bg-bone-soft"
        />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="bg-bone border border-ink px-3 py-2 text-sm focus:outline-none focus:bg-bone-soft"
        >
          <option value="">All countries</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {flagEmoji(c.code)} {c.name}
            </option>
          ))}
        </select>
      </div>

      {pending ? (
        <SkeletonRows count={6} />
      ) : rows.length === 0 ? (
        <EmptyState friendsOnly={friendsOnly} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink/60 border-b border-ink/30">
              <th className="py-2 w-12">#</th>
              <th className="py-2">User</th>
              <th className="py-2">Country</th>
              <th className="py-2">Tools</th>
              <th className="py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isMe = myUsername && r.username === myUsername;
              return (
                <tr key={r.username} className={`border-b border-ink/10 ${isMe ? "bg-hazard/10" : "hover:bg-bone-soft"}`}>
                  <td className="py-2 font-bold tabular-nums">
                    <span className={r.rank <= 3 ? "text-hazard" : ""}>
                      {r.rank}
                    </span>
                  </td>
                  <td className="py-2">
                    <Link href={`/u/${r.username}`} className="font-bold hover:text-hazard inline-flex items-center gap-1.5">
                      {r.countryCode && (
                        <span title={countryName(r.countryCode) ?? r.countryCode}>
                          {flagEmoji(r.countryCode)}
                        </span>
                      )}
                      <span>{r.username}</span>
                      {isMe && <span className="ml-1 text-xs text-hazard">you</span>}
                    </Link>
                  </td>
                  <td className="py-2 text-xs text-ink/60">
                    {r.countryCode ? (countryName(r.countryCode) ?? "—") : (r.location ?? "—")}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.tools.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t.replace("_", " ").toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums font-bold">
                    {fmtScore(r.score)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </SpecCard>
  );
}

function Toggle<T extends string>({
  options, value, onChange,
}: {
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`text-xs uppercase tracking-wide font-bold px-3 py-1 border border-ink transition-colors ${
            o.v === value ? "bg-ink text-bone" : "bg-bone hover:bg-ink/10"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-ink/30 border-b border-ink/20">
          <th className="py-2 w-12">#</th><th className="py-2">User</th><th className="py-2">Where</th><th className="py-2">Tools</th><th className="py-2 text-right">Score</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: count }).map((_, i) => (
          <tr key={i} className="border-b border-ink/10">
            <td className="py-3"><div className="h-3 w-6 bg-ink/10 animate-pulse" /></td>
            <td className="py-3"><div className="h-3 w-32 bg-ink/10 animate-pulse" /></td>
            <td className="py-3"><div className="h-3 w-20 bg-ink/10 animate-pulse" /></td>
            <td className="py-3"><div className="h-3 w-24 bg-ink/10 animate-pulse" /></td>
            <td className="py-3 text-right"><div className="h-3 w-16 bg-ink/10 animate-pulse ml-auto" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState({ friendsOnly }: { friendsOnly: boolean }) {
  return (
    <div className="border-2 border-dashed border-ink/30 p-8 text-center space-y-2">
      <p className="text-sm font-bold uppercase tracking-wide text-ink/60">
        {friendsOnly ? "No friends here yet" : "No one's locked in yet"}
      </p>
      <p className="text-sm text-ink/70">
        {friendsOnly ? (
          <>Follow a few people on their public profiles to populate this view.</>
        ) : (
          <>
            Try a different filter, or be first —{" "}
            <Link href="/settings" className="text-hazard underline">go public</Link>.
          </>
        )}
      </p>
    </div>
  );
}
