"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { SpecCard } from "./spec-card";
import { SectionBar } from "./section-bar";
import { Badge } from "./badge";
import type { LbRow, LbPeriod, LbMetric } from "@/lib/leaderboard";
import { fmtCompact, fmtDuration } from "@/lib/utils";

const PERIODS: { v: LbPeriod; label: string }[] = [
  { v: "weekly",  label: "WEEKLY" },
  { v: "alltime", label: "ALL-TIME" },
];

const METRICS: { v: LbMetric; label: string }[] = [
  { v: "tokens",   label: "TOKENS" },
  { v: "sessions", label: "SESSIONS" },
  { v: "duration", label: "DURATION" },
  { v: "lines",    label: "LINES" },
];

export function LeaderboardClient({ initialRows }: { initialRows: LbRow[] }) {
  const [period, setPeriod] = useState<LbPeriod>("weekly");
  const [metric, setMetric] = useState<LbMetric>("tokens");
  const [rows, setRows] = useState<LbRow[]>(initialRows);
  const [pending, start] = useTransition();
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    if (firstLoad) { setFirstLoad(false); return; }
    start(async () => {
      const res = await fetch(`/api/leaderboard?period=${period}&metric=${metric}`);
      const json = await res.json();
      setRows(json.rows ?? []);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, metric]);

  const fmtScore = (n: number) =>
    metric === "duration" ? fmtDuration(n) : fmtCompact(n);

  return (
    <SpecCard label="STANDINGS" meta={`${period.toUpperCase()} · ${metric.toUpperCase()}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.v}
              onClick={() => setPeriod(p.v)}
              className={`spec-label px-3 py-1 border border-ink transition-colors ${
                p.v === period ? "bg-ink text-hazard" : "bg-bone hover:bg-ink/10"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {METRICS.map((m) => (
            <button
              key={m.v}
              onClick={() => setMetric(m.v)}
              className={`spec-label px-3 py-1 border border-ink transition-colors ${
                m.v === metric ? "bg-ink text-hazard" : "bg-bone hover:bg-ink/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {pending ? (
        <SkeletonRows count={6} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="text-left spec-label text-ink/60 border-b border-ink/30">
              <th className="py-2 w-12">RANK</th>
              <th className="py-2">OPERATOR</th>
              <th className="py-2">TOOLS</th>
              <th className="py-2 text-right">SCORE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.username} className="border-b border-ink/10 hover:bg-bone-soft">
                <td className="py-2 spec-label font-bold">
                  {r.rank <= 3 ? (
                    <span className="text-hazard">#{r.rank.toString().padStart(3, "0")}</span>
                  ) : (
                    `#${r.rank.toString().padStart(3, "0")}`
                  )}
                </td>
                <td className="py-2">
                  <Link
                    href={`/u/${r.username}`}
                    className="font-bold hover:text-hazard"
                  >
                    {r.username}
                  </Link>
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.tools.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums font-bold">
                  {fmtScore(r.score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SpecCard>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <table className="w-full font-mono text-sm">
      <thead>
        <tr className="text-left spec-label text-ink/30 border-b border-ink/20">
          <th className="py-2 w-12">RANK</th>
          <th className="py-2">OPERATOR</th>
          <th className="py-2">TOOLS</th>
          <th className="py-2 text-right">SCORE</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: count }).map((_, i) => (
          <tr key={i} className="border-b border-ink/10">
            <td className="py-3"><div className="h-3 w-8 bg-ink/10 animate-pulse" /></td>
            <td className="py-3"><div className="h-3 w-32 bg-ink/10 animate-pulse" /></td>
            <td className="py-3"><div className="h-3 w-24 bg-ink/10 animate-pulse" /></td>
            <td className="py-3 text-right"><div className="h-3 w-16 bg-ink/10 animate-pulse ml-auto" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-ink/30 p-8 text-center space-y-2">
      <p className="spec-label text-ink/60">NO PUBLIC OPERATORS YET</p>
      <p className="font-mono text-sm text-ink/70">
        Be first — toggle public in{" "}
        <Link href="/settings" className="text-hazard underline">SETTINGS</Link>.
      </p>
    </div>
  );
}
