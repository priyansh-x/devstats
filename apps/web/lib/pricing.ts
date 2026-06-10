/**
 * Per-million-token USD pricing for cost estimation.
 *
 * Anthropic prices verified against
 *   https://platform.claude.com/docs/en/about-claude/models/overview
 * (fetched 2026-06-10). Cache multipliers from Anthropic's prompt-caching docs:
 *   cache read  = 0.10 × input
 *   cache write = 1.25 × input  (5-minute TTL, the Claude Code default)
 *                 2.00 × input  (1-hour TTL — Claude Code uses some of these
 *                 too; we blend toward 5m since it dominates volume)
 *
 * OpenAI prices are best-effort estimates from public pricing pages; treat as
 * approximate until verified per-row. Update when pricing changes — there is no
 * automatic source-of-truth sync.
 */
type Price = {
  input: number;        // $/MTok fresh input
  output: number;       // $/MTok output
  cacheRead: number;    // $/MTok cache hit
  cacheCreate: number;  // $/MTok cache write
};

// IMPORTANT: order matters. More-specific patterns must come before generic
// catch-alls so that e.g. `opus-4-1` (legacy $15) does not get matched by
// `opus-4` (current $5).
const TABLE: { match: RegExp; price: Price }[] = [
  // ── Anthropic ──────────────────────────────────────────────────────
  // Legacy Opus 4.0 / 4.1 — $15/$75 (must match BEFORE opus-4-[5-9])
  { match: /opus-4-1|opus-4-0|opus-4(?![.\-]\d)/i,
    price: { input: 15, output: 75,  cacheRead: 1.5,  cacheCreate: 18.75 } },

  // Current Opus 4.5 / 4.6 / 4.7 / 4.8 — $5/$25
  { match: /opus-4-(5|6|7|8)|opus[.\s]?4[.\s]?(5|6|7|8)/i,
    price: { input: 5,  output: 25,  cacheRead: 0.5,  cacheCreate: 6.25 } },

  // Sonnet 4.x — $3/$15  (4.0, 4.5, 4.6 all the same)
  { match: /sonnet-4|sonnet[.\s]?4/i,
    price: { input: 3,  output: 15,  cacheRead: 0.3,  cacheCreate: 3.75 } },

  // Haiku 4.5 — $1/$5
  { match: /haiku-4|haiku[.\s]?4/i,
    price: { input: 1,  output: 5,   cacheRead: 0.1,  cacheCreate: 1.25 } },

  // Legacy Claude 3 family
  { match: /opus-3|claude-3-opus/i,
    price: { input: 15, output: 75,  cacheRead: 1.5,  cacheCreate: 18.75 } },
  { match: /sonnet-3\.7|sonnet-3-7/i,
    price: { input: 3,  output: 15,  cacheRead: 0.3,  cacheCreate: 3.75 } },
  { match: /sonnet-3\.5|sonnet-3-5/i,
    price: { input: 3,  output: 15,  cacheRead: 0.3,  cacheCreate: 3.75 } },
  { match: /haiku-3\.5|haiku-3-5/i,
    price: { input: 0.8,output: 4,   cacheRead: 0.08, cacheCreate: 1 } },
  { match: /haiku-3|claude-3-haiku/i,
    price: { input: 0.25,output: 1.25,cacheRead: 0.03,cacheCreate: 0.3 } },

  // Anthropic Fable 5 (post-Opus generation) — $10/$50
  { match: /fable-5|mythos-5/i,
    price: { input: 10, output: 50,  cacheRead: 1.0,  cacheCreate: 12.5 } },

  // ── OpenAI ─────────────────────────────────────────────────────────
  // GPT-5 family
  { match: /gpt-5-mini/i,
    price: { input: 0.25, output: 2,  cacheRead: 0.025, cacheCreate: 0.25 } },
  { match: /gpt-5/i,
    price: { input: 1.25, output: 10, cacheRead: 0.125, cacheCreate: 1.25 } },

  // GPT-4.1 family
  { match: /gpt-4\.1-mini|gpt-4-1-mini/i,
    price: { input: 0.4,  output: 1.6, cacheRead: 0.1,  cacheCreate: 0.4 } },
  { match: /gpt-4\.1|gpt-4-1/i,
    price: { input: 2,    output: 8,   cacheRead: 0.5,  cacheCreate: 2 } },

  // GPT-4o family
  { match: /gpt-4o-mini/i,
    price: { input: 0.15, output: 0.6, cacheRead: 0.075,cacheCreate: 0.15 } },
  { match: /gpt-4o|gpt.4o/i,
    price: { input: 2.5,  output: 10,  cacheRead: 1.25, cacheCreate: 2.5 } },

  // Reasoning models
  { match: /o4-mini/i,
    price: { input: 1.1,  output: 4.4, cacheRead: 0.275,cacheCreate: 1.1 } },
  { match: /o3-mini/i,
    price: { input: 1.1,  output: 4.4, cacheRead: 0.55, cacheCreate: 1.1 } },
  { match: /o3/i,
    price: { input: 2,    output: 8,   cacheRead: 0.5,  cacheCreate: 2 } },
  { match: /o1-mini/i,
    price: { input: 1.1,  output: 4.4, cacheRead: 0.55, cacheCreate: 1.1 } },
  { match: /o1/i,
    price: { input: 15,   output: 60,  cacheRead: 7.5,  cacheCreate: 15 } },

  // Older GPT-4
  { match: /gpt-4-turbo/i,
    price: { input: 10,   output: 30,  cacheRead: 10,   cacheCreate: 10 } },
  { match: /gpt-4/i,
    price: { input: 30,   output: 60,  cacheRead: 30,   cacheCreate: 30 } },
];

// Fallback for unknown models — Sonnet-class pricing is the least-wrong default.
const DEFAULT: Price = { input: 3, output: 15, cacheRead: 0.3, cacheCreate: 3.75 };

export function priceFor(model: string | null | undefined): Price {
  if (!model) return DEFAULT;
  for (const row of TABLE) if (row.match.test(model)) return row.price;
  return DEFAULT;
}

/**
 * Compute USD cost for one session row, cache-aware.
 * Prefers split fields (tokensInputRaw / tokensCacheRead / tokensCacheCreate)
 * when present; falls back to treating undifferentiated `tokensIn` as fresh
 * input only if no cache fields are populated (i.e. legacy rows before the
 * schema change).
 */
export function sessionCost(s: {
  model: string | null;
  tokensIn: number | null;
  tokensInputRaw: number | null;
  tokensCacheRead: number | null;
  tokensCacheCreate: number | null;
  tokensOut: number | null;
}): number {
  const p = priceFor(s.model);
  const hasSplit = s.tokensInputRaw != null || s.tokensCacheRead != null || s.tokensCacheCreate != null;
  const raw     = s.tokensInputRaw    ?? (hasSplit ? 0 : (s.tokensIn ?? 0));
  const cRead   = s.tokensCacheRead   ?? 0;
  const cCreate = s.tokensCacheCreate ?? 0;
  const out     = s.tokensOut         ?? 0;
  return (
    (raw     * p.input) +
    (cRead   * p.cacheRead) +
    (cCreate * p.cacheCreate) +
    (out     * p.output)
  ) / 1_000_000;
}

export function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (n >= 100)  return `$${n.toFixed(0)}`;
  if (n >= 10)   return `$${n.toFixed(1)}`;
  if (n >= 1)    return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}
