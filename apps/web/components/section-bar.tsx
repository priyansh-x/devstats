import clsx from "clsx";

/**
 * Solid black bar with hazard-orange uppercase label.
 * The signature "Specs / POWER SYSTEM / SENSORS" header.
 */
export function SectionBar({
  label,
  right,
  className,
}: {
  label: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between bg-ink text-hazard px-4 py-2",
        className,
      )}
    >
      <span className="spec-label font-bold">{label}</span>
      {right ? <span className="spec-label text-bone/80">{right}</span> : null}
    </div>
  );
}
