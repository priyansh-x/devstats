"use client";

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** 7-row (day-of-week) × 24-col (hour) grid of session counts. */
export function HourHeatmap({ data }: { data: { dow: number; hour: number; sessions: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.sessions));
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const d of data) grid[d.dow]![d.hour] = d.sessions;

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse">
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
            <tr key={dow}>
              <td className="spec-label text-ink/40 pr-2">{DOW_LABELS[dow]}</td>
              {row.map((n, h) => {
                const t = n / max;
                const bg =
                  n === 0 ? "#EDE7DC"
                  : t < 0.2 ? "#FFE0CC"
                  : t < 0.5 ? "#FF9C66"
                  : t < 0.8 ? "#FF7A33"
                  : "#FF5A1F";
                return (
                  <td key={h} className="p-0">
                    <div
                      title={`${DOW_LABELS[dow]} ${h}:00 — ${n} sessions`}
                      className="w-5 h-5 border border-ink/10"
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
  );
}
