"use client";

import { useState } from "react";
import type { YearHeatmap } from "@devstats/types";

export function YearHeatmaps({ years }: { years: YearHeatmap[] }) {
  const [active, setActive] = useState(years[0]?.year ?? new Date().getFullYear());
  const current = years.find((y) => y.year === active) ?? years[0];
  if (!current) return null;

  const sessionTotal = current.cells.reduce((s, c) => s + c.count, 0);
  const tokenTotal = current.cells.reduce((s, c) => s + c.tokens, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {years.map((y) => (
            <button
              key={y.year}
              onClick={() => setActive(y.year)}
              className={`spec-label px-3 py-1 border border-ink transition-colors ${
                y.year === active
                  ? "bg-ink text-hazard"
                  : "bg-bone text-ink hover:bg-ink/10"
              }`}
            >
              {y.year}
            </button>
          ))}
        </div>
        <div className="spec-label text-ink/60">
          {sessionTotal} SESSIONS · {fmt(tokenTotal)} TKN
        </div>
      </div>
      <YearGrid cells={current.cells} />
    </div>
  );
}

function YearGrid({ cells }: { cells: YearHeatmap["cells"] }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (cells.length === 0) return null;
  const firstDow = new Date(cells[0]!.date).getUTCDay();
  const padded: (YearHeatmap["cells"][number] | null)[] = [];
  for (let i = 0; i < firstDow; i++) padded.push(null);
  padded.push(...cells);

  const cols: typeof padded[] = [];
  for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));

  const max = Math.max(1, ...cells.map((d) => d.tokens));
  const sel = selected ? cells.find((c) => c.date === selected) : null;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="flex gap-[3px] min-w-fit">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, ri) => {
                const d = col[ri] ?? null;
                if (!d) return <div key={ri} className="w-3 h-3" />;
                const t = d.tokens / max;
                const bg =
                  t === 0 ? "#EDE7DC"
                  : t < 0.15 ? "#FFE0CC"
                  : t < 0.35 ? "#FF9C66"
                  : t < 0.6  ? "#FF7A33"
                  : "#FF5A1F";
                const isSelected = d.date === selected;
                return (
                  <button
                    key={ri}
                    onClick={() => setSelected(isSelected ? null : d.date)}
                    aria-label={d.date}
                    className={`w-3 h-3 border transition-[transform,border-color] duration-100 ease-out hover:scale-125 hover:border-ink ${
                      isSelected ? "border-ink scale-125" : "border-ink/10"
                    }`}
                    style={{ background: bg }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Reserved-height footer: legend or detail bar — no layout shift on toggle */}
      <div className="mt-3 min-h-[2rem] flex items-center">
        {sel ? (
          <div className="flex items-center gap-3 text-sm w-full animate-in fade-in duration-150">
            <span className="w-3 h-3 bg-hazard border border-ink shrink-0" aria-hidden />
            <span className="font-bold">
              {new Date(sel.date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-ink/40">·</span>
            <span className="tabular-nums">{sel.tokens.toLocaleString()} tokens</span>
            <span className="text-ink/40">·</span>
            <span className="tabular-nums">{sel.count} session{sel.count !== 1 ? "s" : ""}</span>
            <button
              onClick={() => setSelected(null)}
              className="ml-auto text-ink/40 hover:text-ink text-xs"
              aria-label="close"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 spec-label text-ink/60">
            <span>LESS</span>
            {["#EDE7DC", "#FFE0CC", "#FF9C66", "#FF7A33", "#FF5A1F"].map((c) => (
              <span key={c} className="w-3 h-3 border border-ink/10" style={{ background: c }} />
            ))}
            <span>MORE</span>
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}
