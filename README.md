<p align="center">
  <img src="https://img.shields.io/npm/v/devstats-cli?label=cli&color=ff5a1f&style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/github/license/priyansh-x/devstats?style=flat-square" alt="license" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-black?style=flat-square" alt="node" />
  <img src="https://img.shields.io/github/actions/workflow/status/priyansh-x/devstats/ci.yml?style=flat-square&label=ci" alt="CI" />
</p>

<h1 align="center">DevStats</h1>

<p align="center">
  Telemetry for AI coding tools. Track tokens, sessions, streaks, and spend<br/>
  across <b>Claude Code</b>, <b>Cursor</b>, <b>Codex</b>, <b>Windsurf</b>, and <b>Antigravity</b>.<br/>
  Private by default. Leaderboard if you're built like that.
</p>

<p align="center">
  <a href="https://devstats.me">Live App</a> · <a href="https://www.npmjs.com/package/devstats-cli">npm</a> · <a href="https://github.com/priyansh-x/devstats/issues">Report Bug</a>
</p>

---

## Quickstart

```bash
npm i -g devstats-cli
devstats login        # paste your API key from devstats.me/settings
devstats sync         # parses local logs, uploads stats
```

Three commands. Parses local logs from every supported tool, uploads aggregate session stats (never message content), and populates your dashboard.

---

## Features

- **Heatmap + streaks** — GitHub-style activity grid across all your AI tools
- **Token tracking** — input, output, cache splits, per-session and aggregate
- **Cost estimates** — model-aware spend calculation from real token counts
- **Project breakdown** — per-folder token and cost tracking
- **Leaderboard** — opt-in public ranking by tokens, sessions, duration, spend, or lines
- **Squads** — private team leaderboards with invite codes
- **Public profiles** — shareable `/u/username` pages with OG cards
- **Dark mode** — for the weak
- **CSV export** — download your raw session data anytime

## Supported tools

| Tool | Source | What we parse |
|---|---|---|
| **Claude Code** | `~/.claude/projects/**/*.jsonl` | Full token splits, models, cache read/create, 30-min session grouping |
| **Cursor** | `state.vscdb` (SQLite) | One session per chat, tokens, mode (agent/chat/edit) |
| **Codex** | `~/.codex/sessions/**/*.jsonl` | Cumulative token counts, model, working directory |
| **Windsurf** | `state.vscdb` (SQLite) | Cascade conversations, tokens, models |
| **Antigravity** | `state.vscdb` (SQLite) | Activity presence only (0 tokens — Google keeps data server-side) |
| **CSV** | Manual upload | Column-mapping UI for anything else |

## Privacy

Private by default. The CLI **never** uploads message content, file paths, repo URLs, or secrets. Only folder basenames are sent as project identifiers. Public profiles require explicit opt-in.

Run `devstats sync --dry-run` to inspect exactly what would be sent.

## CLI commands

```
devstats login                  Authenticate with API key
devstats sync                   Parse + upload (delta since last sync)
devstats sync --dry-run         Preview without uploading
devstats sync --tool <name>     Restrict to one parser
devstats doctor                 Diagnose tool detection + connectivity
devstats dashboard              Terminal dashboard
devstats whoami                 Current operator + stats
devstats leaderboard            Public rankings
devstats squad create <name>    Create a private team board
devstats squad join <code>      Join with an invite code
devstats open                   Open web dashboard in browser
```

## Project structure

```
apps/
  web/        Next.js 14 — dashboard, API routes, auth
  cli/        devstats-cli (npm package)
packages/
  parsers/    Tool-specific log parsers + tests
  types/      Shared TypeScript types
prisma/       Database schema
```

## Stack

Next.js 14 · Tailwind · Supabase (Auth + Postgres) · Prisma · Upstash Redis · Vercel · tsup

## Local development

```bash
git clone https://github.com/priyansh-x/devstats.git
cd devstats && pnpm install

# Set up .env with Supabase + Redis credentials (see .env.example)
pnpm db:push
pnpm dev          # → http://localhost:3000
```

## Contributing

[Bug reports](https://github.com/priyansh-x/devstats/issues/new?template=bug_report.yml) and [feature requests](https://github.com/priyansh-x/devstats/issues/new?template=feature_request.yml) welcome.

```bash
pnpm --filter @devstats/parsers test    # run parser tests
pnpm --filter @devstats/web build       # verify web builds
```

## License

[MIT](LICENSE)
