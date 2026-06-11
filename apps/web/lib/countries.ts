/**
 * ISO 3166-1 alpha-2 country list + flag-emoji helpers.
 *
 * `countryCode` on a User is one of these two-letter codes (uppercase). The
 * leaderboard filters by exact code so "country-wise" grouping is unambiguous
 * (free-form city text still lives in `location`). Flag emoji are derived from
 * the code via Unicode regional-indicator symbols — no image assets needed.
 */
export interface Country {
  code: string; // ISO 3166-1 alpha-2, uppercase
  name: string;
}

// Curated but broad list — common dev hubs first-class, alphabetised by name.
export const COUNTRIES: Country[] = [
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "BG", name: "Bulgaria" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "HR", name: "Croatia" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "KE", name: "Kenya" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "PK", name: "Pakistan" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "RS", name: "Serbia" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Türkiye" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "VN", name: "Vietnam" },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** True if `code` is a known ISO alpha-2 in our list. */
export function isCountryCode(code: string | null | undefined): code is string {
  return !!code && BY_CODE.has(code.toUpperCase());
}

/** Human-readable name for a code, or the raw code if unknown. */
export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase())?.name ?? code.toUpperCase();
}

/**
 * Flag emoji for a two-letter code, built from regional-indicator symbols.
 * Returns "" for an absent/invalid code so callers can render nothing.
 */
export function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

// Reverse index, lower-cased, for guessCountryCode below.
const BY_NAME = new Map(COUNTRIES.map((c) => [c.name.toLowerCase(), c.code]));

/**
 * Common shorthands and demonyms people actually write on GitHub. Kept small
 * and obviously-correct — we'd rather skip a guess than mis-classify.
 */
const ALIAS: Record<string, string> = {
  "usa": "US",
  "u.s.a.": "US",
  "u.s.": "US",
  "united states of america": "US",
  "america": "US",
  "uk": "GB",
  "u.k.": "GB",
  "england": "GB",
  "scotland": "GB",
  "wales": "GB",
  "great britain": "GB",
  "uae": "AE",
  "u.a.e.": "AE",
  "south korea": "KR",
  "korea": "KR",
  "republic of korea": "KR",
  "russia": "RU",
  "russian federation": "RU",
  "czech republic": "CZ",
  "the netherlands": "NL",
  "holland": "NL",
  "viet nam": "VN",
};

/**
 * Best-effort: parse a GitHub-style location string ("Mumbai, India",
 * "San Francisco, CA", "Berlin, Germany") → ISO 3166-1 alpha-2. Returns null
 * if no comma-separated segment matches a known country or alias.
 *
 * Walks right→left because the country usually trails city/state. Never
 * invents a country code from a US state abbreviation or similar — better to
 * leave the field null than mark a Texan as Tonga.
 */
export function guessCountryCode(location: string | null | undefined): string | null {
  if (!location) return null;
  const segments = location.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (segments.length === 0) return null;
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i]!;
    if (BY_NAME.has(s)) return BY_NAME.get(s)!;
    if (ALIAS[s]) return ALIAS[s];
  }
  return null;
}
