# DevStats

> **Field-ops telemetry for AI-assisted coding.**
> Track tokens, sessions, streaks, and spend across Claude Code, Cursor, Antigravity, and more. Private by default. Opt-in public leaderboards.

```
DSU-01 / DEVELOPER STATS UNIT       FIELD OPS READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TOKENS IN       632.87M       SESSIONS    60
  TOKENS OUT      4.50M         DURATION    24.6H
  STREAK          3D            EST. SPEND  $312
  ACTIVE DAYS     19            ──────────────────
```

DevStats is a personal-and-social analytics layer over the AI tools you already use. Drop in a CLI, run `devstats sync`, and your last year of Claude Code / Cursor / Antigravity activity shows up as a year-by-year heatmap, a hour-of-week grid, a cache-aware spend estimate, and (if you opt in) a rank on a global leaderboard.

The aesthetic is industrial spec-sheet — hazard orange, mono type, black header bars — because dashboards should feel like a piece of kit, not a SaaS lobby.

---

## Status

| Phase | What | State |
|---|---|---|
| **1** | Monorepo · Supabase Postgres · Claude Code parser · dashboard | ✅ |
| **2** | Real CLI · API-key auth · delta sync · CSV upload | ✅ |
| **3** | Privacy + consent · leaderboard · public `/u/[username]` · OG image | ✅ |
| **4** | CLI bundling for npm · Cursor parser · Antigravity parser | ✅ |
| Next | npm publish · Vercel deploy · tests | open |

---

## Quickstart — try the CLI

```bash
# from your repo checkout (until 0.1 lands on npm)
git clone https://github.com/priyansh-x/devstats.git
cd devstats
pnpm install

# 1. spin up the web app at http://localhost:3000
pnpm db:push     # syncs Prisma schema to your Postgres
pnpm dev

# 2. in another shell, log in to the CLI
./bin/devstats login          # paste the API key from /settings → API KEY
./bin/devstats sync --dry-run # preview without uploading
./bin/devstats sync           # uploads delta since last successful run
./bin/devstats whoami
```

Add `bin/` to your `PATH` (or alias `./bin/devstats`) and you can drop the prefix.

When the CLI ships on npm:

```bash
npm install -g devstats-cli
devstats login
devstats sync
```

---

## Supported tools

| Tool | Source | Notes |
|---|---|---|
| **Claude Code** | `~/.claude/projects/**/*.jsonl` | Full token splits (input / output / cache read / cache create), per-session models, 30-min gap session grouping. The flagship integration. |
| **Cursor** | `state.vscdb` SQLite (`composerData` + `bubbleId` rows) | One session per composer (chat), real `createdAt`/`lastUpdatedAt`. Tokens as reported by Cursor. |
| **Antigravity** | `state.vscdb` (`antigravity.notification.*` keys) | **Activity-presence only** — Google stores transcripts in the cloud, not locally, so we emit one session per conversation ID without token counts. The heatmap will light up where you used it, but spend/leaderboard tokens are 0 until Google ships a usage-export API. |
| **CSV / JSON** | Manual upload at `/settings` | Generic fallback for tools without a parser, or for power users. Column-mapping UI. |

---

## Repository layout

```
devstats/
├── apps/
│   ├── web/                Next.js 14 — frontend + API routes + Prisma client
│   └── cli/                devstats-cli (published to npm as devstats-cli)
├── packages/
│   ├── parsers/            tool-specific log parsers — claude-code, cursor, antigravity, csv
│   └── types/              shared types (Tool union, NormalisedSession, DashboardStats)
├── prisma/
│   └── schema.prisma       User / Session / DailySummary / Streak / LeaderboardEntry
├── bin/
│   └── devstats            local-dev wrapper (pnpm + tsx)
├── docs/                   internal notes (handoff transcripts etc.)
└── README.md
```

---

## Architecture

```
            ┌──────────────────────┐
  ~/.claude │   parser: Claude     │
            └──────────┬───────────┘
   Cursor   ┌──────────▼───────────┐    Bearer ds_live_*
  state.db  │  CLI: devstats sync  │ ─────────────────────▶  POST /api/sessions/upload
            └──────────┬───────────┘                              │
 Antigravity          ...                                         ▼
                                                          ┌──────────────┐
                                                          │ Supabase     │
                                                          │ Postgres     │
                                                          └──────┬───────┘
                                                                 │
                            ┌────────────────────────────────────┴────────────────────────┐
                            ▼                                                             ▼
                  /dashboard (private)                                       /leaderboard (public)
                    SpecCards + heatmaps                                       /u/[username]
                    cache-aware spend                                          OG card → Twitter
                                                                               │
                                                                       cached in Upstash Redis (1h)
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Web | **Next.js 14 (App Router)** + TypeScript | Server components for fast dashboards, route handlers for the API, OG image generation in-tree |
| Styling | **Tailwind CSS** + Geist Sans/Mono | Spec-sheet design language via custom tokens (`hazard`, `ink`, `bone`) |
| Charts | **Recharts** + hand-rolled SVG heatmaps | Themable, no canvas runtime |
| Auth | **Supabase Auth** (GitHub OAuth + magic links) | One service for auth + DB; CLI uses bearer API keys |
| DB | **Postgres on Supabase** via **Prisma** | Pooled connection for serverless, direct for migrations |
| Cache | **Upstash Redis** | Leaderboard 1-hour TTL, no infra to run |
| CLI | TypeScript + **tsup** bundle | Single 20 KB ESM file, `better-sqlite3` stays external |
| Deploy | **Vercel** (web) + npm (CLI) | Standard playbook |

---

## Privacy

DevStats is private-by-default. Specifically, the CLI and parsers will **never** upload:

- Message content, prompts, or completions
- Real file paths or project names (always SHA-256 hashed before upload)
- Repository URLs
- API keys, tokens, or environment variables

Every parser's output is a `NormalisedSession`: tool, timestamps, token counts, duration, model name, and a hashed project slug. That's it.

Your profile is **private by default**. Going public requires an explicit consent modal in `/settings`. Toggling back to private immediately wipes your leaderboard entries and returns 404 on your `/u/<username>` URL.

See [the live `/privacy` page](http://localhost:3000/privacy) when running locally.

---

## Local dev — full setup

```bash
git clone https://github.com/priyansh-x/devstats.git
cd devstats
pnpm install

# Supabase: create a project at supabase.com, then in apps/web/.env.local:
cat > .env <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<pw>@aws-1-<region>.pooler.supabase.com:5432/postgres"
UPSTASH_REDIS_REST_URL=https://<...>.upstash.io
UPSTASH_REDIS_REST_TOKEN=...
EOF
ln -sf ../../.env apps/web/.env.local   # Next reads from apps/web/, Prisma walks up to root

pnpm db:push        # creates the schema on Supabase
pnpm dev            # → http://localhost:3000
```

Generate a CLI key at `/settings` and you're off.

---

## Contributing

Issues and PRs welcome. Areas with shovel-ready scope:

- **Windsurf** + **Copilot** parsers (the schema's already there)
- A real test suite for the parsers (vitest + fixture VSDBs)
- Vercel deploy guide + production env-var checklist
- A weekly digest email (Resend) for streaks
- CLI auto-update notifier

---

## License

MIT — see [`LICENSE`](LICENSE).
Built at **BITS Pilani**.
