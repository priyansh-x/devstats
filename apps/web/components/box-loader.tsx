/**
 * Brand loader — a row of orange squares blinking in a scanning wave.
 * Pure CSS (works inside route-level loading.tsx with zero JS).
 */
export function BoxLoader({ label = "LOADING" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-[5px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="box-loader-cell w-4 h-4 bg-hazard border border-ink"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <span className="spec-label text-ink/50">{label}</span>
    </div>
  );
}
