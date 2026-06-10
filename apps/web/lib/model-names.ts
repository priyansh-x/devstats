/**
 * Friendly display names for the raw model identifiers parsers emit.
 * Returns the original string if no rule matches — never throws.
 */
const RULES: { match: RegExp; label: string }[] = [
  // Anthropic
  { match: /opus-4-8/i,         label: "Claude Opus 4.8" },
  { match: /opus-4-7/i,         label: "Claude Opus 4.7" },
  { match: /opus-4-6/i,         label: "Claude Opus 4.6" },
  { match: /opus-4-5/i,         label: "Claude Opus 4.5" },
  { match: /opus-4-1/i,         label: "Claude Opus 4.1" },
  { match: /opus-4(?![.\-]\d)/i,label: "Claude Opus 4" },
  { match: /opus-3/i,           label: "Claude Opus 3" },
  { match: /sonnet-4-6/i,       label: "Claude Sonnet 4.6" },
  { match: /sonnet-4-5/i,       label: "Claude Sonnet 4.5" },
  { match: /sonnet-4(?![.\-]\d)/i, label: "Claude Sonnet 4" },
  { match: /sonnet-3\.7|sonnet-3-7/i, label: "Claude Sonnet 3.7" },
  { match: /sonnet-3\.5|sonnet-3-5/i, label: "Claude Sonnet 3.5" },
  { match: /haiku-4-5/i,        label: "Claude Haiku 4.5" },
  { match: /haiku-3\.5|haiku-3-5/i, label: "Claude Haiku 3.5" },
  { match: /haiku-3/i,          label: "Claude Haiku 3" },
  // OpenAI
  { match: /gpt-5-mini/i,       label: "GPT-5 mini" },
  { match: /gpt-5/i,            label: "GPT-5" },
  { match: /gpt-4\.1-mini|gpt-4-1-mini/i, label: "GPT-4.1 mini" },
  { match: /gpt-4\.1|gpt-4-1/i, label: "GPT-4.1" },
  { match: /gpt-4o-mini/i,      label: "GPT-4o mini" },
  { match: /gpt-4o/i,           label: "GPT-4o" },
  { match: /gpt-4-turbo/i,      label: "GPT-4 Turbo" },
  { match: /gpt-4/i,            label: "GPT-4" },
  { match: /o4-mini/i,          label: "o4-mini" },
  { match: /o3-mini/i,          label: "o3-mini" },
  { match: /o3\b/i,             label: "o3" },
  { match: /o1-mini/i,          label: "o1-mini" },
  { match: /o1\b/i,             label: "o1" },
  // Cursor agent modes
  { match: /^cursor\/(.+)$/i,   label: "Cursor · $1" },
  // Antigravity
  { match: /antigravity\/agent/i, label: "Antigravity Agent" },
];

export function friendlyModel(raw: string | null | undefined): string {
  if (!raw) return "—";
  for (const r of RULES) {
    const m = raw.match(r.match);
    if (!m) continue;
    return r.label.includes("$1") && m[1]
      ? r.label.replace("$1", m[1])
      : r.label;
  }
  return raw;
}
