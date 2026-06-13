# devstats-cli

> Local telemetry for AI coding tools. Parses your Claude Code, Cursor, Windsurf, Codex, and Antigravity logs, uploads aggregate stats to [devstats-x.vercel.app](https://devstats-x.vercel.app), and lets you compete on public leaderboards and private squads.

## Install

```bash
npm install -g devstats-cli
```

Requires **Node >= 20**. macOS, Linux, and Windows are supported.

## Quickstart

```bash
# 1. Generate an API key at devstats-x.vercel.app/settings, then:
devstats login

# 2. Preview what the parsers find (no upload):
devstats preview

# 3. Dry-run sync (parses + summarizes, never uploads):
devstats sync --dry-run

# 4. Real sync (uploads delta since last successful sync):
devstats sync

# 5. See your stats:
devstats whoami
devstats dashboard
```

## Supported tools

| Tool | Source | Notes |
|---|---|---|
| Claude Code | `~/.claude/projects/**/*.jsonl` | Token counts, timestamps, model names. Never message content. |
| Cursor | `state.vscdb` (platform-specific path) | Sessions from `composerData` + `bubbleId`. Tokens and timestamps only. |
| Windsurf | Local Windsurf storage | Sessions with token counts and timestamps. |
| Codex | `~/.codex/sessions/**/*.jsonl` | OpenAI Codex CLI rollout logs. Token counts, model, timestamps. |
| Antigravity | Local Antigravity logs | Sessions land with 0 tokens (Google stores transcripts server-side). Heatmap and active-days still work. |

## Commands

### Core

```
devstats login                       authenticate (paste your API key)
devstats whoami [--json]             show current operator + remote totals
devstats status                      local sync state + remote totals
devstats sync [flags]                parse and upload (delta-only) sessions
devstats preview                     parse local logs, print spec sheet (no upload)
devstats dashboard                   render your dashboard in the terminal
devstats logout                      remove stored credentials
devstats --version                   print CLI version
```

### Sync flags

```
--dry-run                            parse + summarize, never upload
--full                               ignore the local cursor and reupload everything
--tool <name>                        restrict to one parser
                                     (claude-code | cursor | antigravity | windsurf | codex)
```

### Profiles and leaderboard

```
devstats profile [handle] [--json]   render a public operator's profile
                                     (defaults to your own if public)
devstats leaderboard [flags] [--json]
  --period daily|weekly|monthly|alltime   default: weekly
  --metric tokens|sessions|duration|lines default: tokens
  --top N                                 default: 10
```

### Squads (private team leaderboards)

```
devstats squad list                  your squads + invite codes
devstats squad create <name>         create a squad, get an invite code
devstats squad join <code>           join with an invite code
devstats squad <slug>                squad standings in the terminal
devstats squad leave <slug>          leave (last member out deletes it)
```

### Diagnostics

```
devstats doctor                      diagnose tool detection + parsing
devstats doctor --report             write an anonymized JSON bundle for bug reports
devstats config                      show local config (API key masked)
devstats config set url <url>        point the CLI at a different host
```

### Open in browser

```
devstats open                        open your dashboard
devstats open settings               open settings page
devstats open leaderboard            open the public leaderboard
devstats open profile                open your public profile
```

## Configuration

| Where | What |
|---|---|
| `~/.devstats/config.json` | API key + base URL (mode `0600`) |
| `~/.devstats/cursor.json` | Per-tool delta cursor (only newer sessions are uploaded) |
| env `DEVSTATS_URL` | Override the API host (default `https://devstats-x.vercel.app`) |

## Error handling

If a sync fails for one tool, the CLI continues with the remaining tools and prints a consolidated error summary at the end. Common errors:

- **401 / 403** — invalid or expired API key. Re-run `devstats login`.
- **Network errors** — check your connection or `DEVSTATS_URL`.
- **Parse errors** — run `devstats doctor` to diagnose.
- **429** — rate limited. Wait a moment and retry.

Use `devstats doctor --report` to generate a diagnostics file you can attach to a GitHub issue.

## Privacy

This CLI was designed privacy-first. It will **never** upload:

- Message or conversation content
- Real file paths (project names are SHA-256 hashed before upload)
- Repo URLs
- API keys, secrets, or environment variables

Run any command with `--dry-run` to inspect exactly what would be sent.

Your profile is **private by default**. Toggle visibility at [devstats-x.vercel.app/settings](https://devstats-x.vercel.app/settings) to appear on the public leaderboard.

## License

MIT
