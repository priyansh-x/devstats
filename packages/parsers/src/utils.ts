import { basename } from "node:path";

export function hashProjectName(name: string): string {
  const base = basename(name);
  return base || name;
}

export function modeOfStrings(xs: string[]): string | undefined {
  if (xs.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best: string | undefined;
  let bestN = -1;
  for (const [k, n] of counts) if (n > bestN) (best = k), (bestN = n);
  return best;
}
