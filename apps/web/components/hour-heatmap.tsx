"use client";

import { useState } from "react";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

export function HourHeatmap({ data }: { data: { dow: number; hour: number; sessions: number }[] }) {
  const [selected, setSelected] = useState<{ dow: number; hour: number } | null>(null);
  const max = Math.max(1, ...data.map((d) => d.sessions));
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const d of data) grid[d.dow]![d.hour] = d.sessions;

  const sel = selected ? { ...selected, sessions: grid[selected.dow]![selected.hour]! } : null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-collapse mx-auto" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th className="w-6" />
              {Array.from({ length: 24 }).map((_, h) => (
                <th key={h} className="spec-label text-ink/40 font-normal w-5 text-center align-bottom pb-1">
                  {h % 3 === 0 ? h : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, dow) => (
              <tr key={dow} className="col-in" style={{ animationDelay: `${dow * 50}ms` }}>
                <td className="spec-label text-ink/40 pr-2">{DOW_SHORT[dow]}</td>
                {row.map((n, h) => {
                  const t = n / max;
                  const isDark = document.documentElement.classList.contains("dark");
                  const bg =
                    n === 0 ? (isDark ? "#1A1A1A" : "#EDE7DC")
                    : t < 0.2 ? "#FFE0CC"
                    : t < 0.5 ? "#FF9C66"
                    : t < 0.8 ? "#FF7A33"
                    : "#FF5A1F";
                  const isSelected = selected?.dow === dow && selected?.hour === h;
                  return (
                    <td key={h} className="p-0">
                      <button
                        onClick={() => setSelected(isSelected ? null : { dow, hour: h })}
                        aria-label={`${DOW_LABELS[dow]} ${h}:00 — ${n} sessions`}
                        className={`w-5 h-5 border transition-[transform,border-color] duration-100 ease-out hover:scale-125 hover:border-ink ${
                          isSelected ? "border-ink scale-125" : "border-ink/10"
                        }`}
                        style={{ background: bg }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 min-h-[2rem] flex items-center">
        {sel ? (
          <div className="flex items-center gap-3 text-sm w-full animate-in fade-in duration-150">
            <span className="w-3 h-3 bg-hazard border border-ink shrink-0" aria-hidden />
            <span className="font-bold">{DOW_LABELS[sel.dow]} {sel.hour}:00–{sel.hour + 1}:00</span>
            <span className="text-ink/40">·</span>
            <span className="tabular-nums">{sel.sessions} session{sel.sessions !== 1 ? "s" : ""}</span>
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
            {["var(--bg-soft)", "#FFE0CC", "#FF9C66", "#FF7A33", "#FF5A1F"].map((c, i) => (
              <span key={i} className="w-3 h-3 border border-ink/10" style={{ background: c }} />
            ))}
            <span>MORE</span>
          </div>
        )}
      </div>
    </div>
  );
}
