import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UNITS = ["", "K", "M", "B", "T"];

export function fmtCompact(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1000) return sign + abs.toFixed(0);
  const tier = Math.min(UNITS.length - 1, Math.floor(Math.log10(abs) / 3));
  const v = abs / 10 ** (tier * 3);
  return `${sign}${v.toFixed(digits).replace(/\.0$/, "")}${UNITS[tier]}`;
}

export function fmtDuration(ms: number): string {
  if (!ms) return "0H";
  const h = ms / (1000 * 60 * 60);
  if (h < 1) return `${Math.round(ms / 60000)}M`;
  return `${h.toFixed(1)}H`;
}
