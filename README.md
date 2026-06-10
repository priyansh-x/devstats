# DevStats

Developer productivity analytics for AI coding tools. Track tokens, sessions,
streaks across Claude Code / Cursor / Copilot. Private by default, opt-in
public leaderboards.

```
apps/
  web/        Next.js 14 — frontend + API
  cli/        devstats CLI (npm)
packages/
  parsers/    tool-specific log parsers
  types/      shared types
prisma/       schema
```

## Quickstart

```bash
pnpm install
cp .env.example .env
pnpm db:push          # creates SQLite dev.db
pnpm dev              # http://localhost:3000
```

Swap `DATABASE_URL` to your Supabase Postgres URL when ready.
