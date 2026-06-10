import clsx from "clsx";

export function Badge({
  children,
  variant = "outline",
  className,
}: {
  children: React.ReactNode;
  variant?: "outline" | "solid" | "hazard";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "spec-label inline-flex items-center px-2 py-0.5 border",
        variant === "solid" && "bg-ink text-hazard border-ink",
        variant === "outline" && "border-ink text-ink",
        variant === "hazard" && "bg-hazard text-ink border-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
