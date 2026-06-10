# devstats-cli

> Local telemetry for AI coding tools. Parses your Claude Code and Cursor logs, uploads aggregate stats to [devstats.app](https://devstats.app), optionally appears on a public leaderboard.

## Install

```bash
npm install -g devstats-cli
```

Requires **Node ≥ 20**. macOS, Linux, and Windows are supported.

## Quickstart

```bash
# 1. Generate an API key at devstats.app/settings, then:
devstats login

# 2. Preview — parses your local logs, uploads nothing:
devstats sync --dry-run

# 3. Real sync — uploads delta since your last successful sync:
devstats sync

# 4. Identity & sync history:
devstats whoami
devstats status
```

## What it reads

| Tool | Source | Privacy |
|---|---|---|
| Claude Code | `~/.claude/projects/**/*.jsonl` | Only aggregate token counts, timestamps, and SHA-256 hashes of project folder names are uploaded — never message content, prompts, or real file paths. |
| Cursor | `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` (macOS), `%APPDATA%\Cursor\…` (Windows), `~/.config/Cursor/…` (Linux) | One session per chat conversation, derived from `composerData` + `bubbleId` rows. Tokens and timestamps only. |

## Commands

```
devstats login                     authenticate (pastes API key)
devstats whoami                    show current operator + remote totals
devstats status                    local sync state + remote totals
devstats sync [flags]              parse and upload (delta-only) sessions
  --dry-run                          parse + summarize, never upload
  --full                             ignore the local cursor and reupload everything
  --tool claude-code|cursor          restrict to one parser
devstats preview                   parse local logs, print spec sheet (no auth required)
devstats logout                    remove stored credentials
devstats --version
```

## Configuration

| Where | What |
|---|---|
| `~/.devstats/config.json` | API key + base URL (mode `0600`) |
| `~/.devstats/cursor.json` | Per-tool delta cursor — only sessions newer than this are uploaded |
| env `DEVSTATS_URL` | Override the API host (default `https://devstats.app`; `http://localhost:3000` in dev) |

## Privacy

This CLI was designed privacy-first. It will **never** upload:

- Message or conversation content
- Real file paths (project names are SHA-256 hashed before upload)
- Repo URLs
- API keys, secrets, or environment variables

Run any command with `--dry-run` to inspect exactly what would be sent before it leaves your machine.

Your profile is **private by default**. To appear on the public leaderboard, toggle visibility explicitly at [devstats.app/settings](https://devstats.app/settings).

## License

MIT
