import clsx from "clsx";
import { SectionBar } from "./section-bar";

/**
 * Spec-sheet block: black header bar + content panel.
 * Variants:
 *  - "bone"   white panel on grid bg (default — for dashboard cards)
 *  - "hazard" orange panel (hero / accent)
 */
export function SpecCard({
  label,
  meta,
  variant = "bone",
  className,
  children,
}: {
  label: string;
  meta?: string;
  variant?: "bone" | "hazard";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={clsx(
        "border border-ink transition-shadow duration-200",
        // Subtle hard "lifted" shadow — matches the spec-sheet print aesthetic
        // (no blur, hazard offset) instead of generic Material elevation.
        "hover:shadow-[4px_4px_0_0_#0A0A0A]",
        variant === "hazard" ? "bg-hazard" : "bg-bone",
        className,
      )}
    >
      <SectionBar label={label} right={meta} />
      <div className="p-5">{children}</div>
    </section>
  );
}

export function SpecMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="spec-label text-ink/60">{label}</span>
      <span className="font-display text-3xl font-black tabular-nums leading-none">
        {value}
        {unit ? (
          <span className="ml-1 font-mono text-base font-normal text-ink/60">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}
