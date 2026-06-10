// shebang is added by tsup's banner config at build time; in dev we go
// through `tsx src/index.ts` so it's never needed here.
import { parseClaudeCode, parseCursor, parseAntigravity } from "@devstats/parsers";
import { loadConfig, saveConfig, loadCursor, saveCursor, PATHS } from "./config.js";
import { c, bar, row, ok, warn, err, info, blank, fmt, prompt } from "./ui.js";
import { whoami, upload, leaderboard } from "./api.js";
import { spawn } from "node:child_process";

const DEFAULT_API_URL = process.env.DEVSTATS_URL ?? "http://localhost:3000";
const args = process.argv.slice(2);
const cmd = args[0] ?? "help";

async function main() {
  switch (cmd) {
    case "login":       return cmdLogin();
    case "whoami":      return cmdWhoami();
    case "status":      return cmdStatus();
    case "sync":        return cmdSync(args.slice(1));
    case "preview":     return cmdPreview();
    case "open":        return cmdOpen(args.slice(1));
    case "leaderboard":
    case "lb":          return cmdLeaderboard(args.slice(1));
    case "logout":      return cmdLogout();
    case "-v":
    case "--version":
      console.log("devstats-cli 0.0.1");
      return;
    case "help":
    case "--help":
    case "-h":
    default:            return cmdHelp();
  }
}

function cmdHelp() {
  console.log(`${c.bold}devstats${c.reset} — telemetry for AI coding tools

${c.bold}usage:${c.reset}
  devstats login                       authenticate (paste your API key)
  devstats whoami                      show current operator + remote totals
  devstats status                      local sync state + remote totals
  devstats sync [flags]                parse and upload (delta) sessions
  devstats preview                     parse local logs, print spec sheet (no upload)
  devstats leaderboard [flags]         fetch + print the public leaderboard
  devstats open [page]                 open dashboard / settings / leaderboard / profile
  devstats logout                      remove stored credentials

${c.bold}sync flags:${c.reset}
  --dry-run                            parse + summarize, never upload
  --full                               ignore the local cursor and reupload everything
  --tool <name>                        restrict to one parser
                                       (claude-code | cursor | antigravity)

${c.bold}leaderboard flags:${c.reset}
  --period weekly|alltime              default: weekly
  --metric tokens|sessions|duration|lines  default: tokens
  --top N                              default: 10

${c.bold}open targets:${c.reset}
  devstats open                        → dashboard
  devstats open settings               → settings (API key, CLI walkthrough)
  devstats open leaderboard            → public leaderboard
  devstats open profile                → your public profile (only if public)

${c.bold}env:${c.reset}
  DEVSTATS_URL                         override the API host
                                       (default ${DEFAULT_API_URL})

config stored in ${PATHS.DIR}/`);
}

async function cmdLogin() {
  const apiUrl = DEFAULT_API_URL;
  blank();
  info(`Open ${c.bold}${apiUrl}/settings${c.reset} → API KEY → GENERATE KEY → copy it.`);
  info(`(override the host with ${c.dim}DEVSTATS_URL=https://…${c.reset})`);
  blank();
  const apiKey = await prompt("Paste API key:", { hidden: true });
  if (!apiKey.startsWith("ds_live_")) {
    err("That doesn't look like a devstats key (expected ds_live_…). Aborting.");
    process.exit(1);
  }
  const cfg: { apiUrl: string; apiKey: string; username?: string } = { apiUrl, apiKey };
  try {
    const me = await whoami(cfg);
    cfg.username = me.username;
    await saveConfig(cfg);
    ok(`Logged in as ${c.bold}${me.username}${c.reset} at ${c.dim}${apiUrl}${c.reset}.`);
  } catch (e: any) {
    err(`Login failed: ${e.message}`);
    process.exit(1);
  }
}

async function cmdWhoami() {
  const cfg = await loadConfig();
  if (!cfg?.apiKey) {
    warn("Not logged in. Run `devstats login` first.");
    process.exit(1);
  }
  try {
    const me = await whoami(cfg);
    blank();
    bar("operator", me.username);
    row("email",         me.email);
    row("visibility",    me.isPublic ? "PUBLIC" : "PRIVATE");
    row("sessions",      me.sessions);
    row("tokens in",     fmt(me.tokensIn));
    row("tokens out",    fmt(me.tokensOut));
    row("last sync",     me.lastSyncAt?.slice(0, 19).replace("T", " ") ?? "—");
    blank();
  } catch (e: any) {
    err(`whoami failed: ${e.message}`);
    process.exit(1);
  }
}

async function cmdStatus() {
  const cfg = await loadConfig();
  const cursor = await loadCursor();
  blank();
  bar("local state");
  row("config",     cfg ? PATHS.CONFIG_PATH : "(not logged in)");
  row("api url",    cfg?.apiUrl ?? "—");
  row("operator",   cfg?.username ?? "—");
  if (Object.keys(cursor).length === 0) {
    row("last sync", "(never)");
  } else {
    for (const [tool, ts] of Object.entries(cursor)) {
      row(`cursor: ${tool}`, new Date(ts).toISOString().slice(0, 19).replace("T", " "));
    }
  }
  blank();
  if (cfg) await cmdWhoami();
}

async function cmdSync(rest: string[]) {
  const cfg = await loadConfig();
  if (!cfg?.apiKey) {
    warn("Not logged in. Run `devstats login` first.");
    process.exit(1);
  }
  const dryRun = rest.includes("--dry-run");
  const full   = rest.includes("--full");
  const toolIdx = rest.indexOf("--tool");
  const onlyTool = toolIdx >= 0 ? rest[toolIdx + 1] : undefined;

  const cursor = full ? {} : await loadCursor();

  blank();
  bar("sync", dryRun ? "dry-run" : "live");

  let totalParsed = 0;
  let totalInserted = 0;
  let latest = { ...cursor };

  if (!onlyTool || onlyTool === "claude-code") {
    const since = cursor["CLAUDE_CODE"];
    if (since) info(`claude-code: only events ≥ ${new Date(since).toISOString().slice(0, 19)}Z`);
    const { sessions, warnings } = await parseClaudeCode({ sinceMs: since });
    totalParsed += sessions.length;
    for (const w of warnings.slice(0, 3)) warn(w);

    if (sessions.length === 0) {
      info("claude-code: nothing new.");
    } else if (dryRun) {
      printPreview("claude-code", sessions);
    } else {
      try {
        const res = await upload(cfg, sessions);
        ok(`claude-code: uploaded ${res.inserted} / ${res.received} (skipped ${res.skipped} dup).`);
        totalInserted += res.inserted;
        latest["CLAUDE_CODE"] = Math.max(
          latest["CLAUDE_CODE"] ?? 0,
          ...sessions.map((s) => s.startedAt.getTime()),
        );
      } catch (e: any) {
        err(`claude-code upload failed: ${e.message}`);
        process.exit(1);
      }
    }
  }

  if (!onlyTool || onlyTool === "cursor") {
    const since = cursor["CURSOR"];
    if (since) info(`cursor: only events ≥ ${new Date(since).toISOString().slice(0, 19)}Z`);
    const { sessions, warnings } = await parseCursor({ sinceMs: since });
    totalParsed += sessions.length;
    for (const w of warnings.slice(0, 3)) warn(w);

    if (sessions.length === 0) {
      info("cursor: nothing new.");
    } else if (dryRun) {
      printPreview("cursor", sessions);
    } else {
      try {
        const res = await upload(cfg, sessions);
        ok(`cursor: uploaded ${res.inserted} / ${res.received} (skipped ${res.skipped} dup).`);
        totalInserted += res.inserted;
        latest["CURSOR"] = Math.max(
          latest["CURSOR"] ?? 0,
          ...sessions.map((s) => s.startedAt.getTime()),
        );
      } catch (e: any) {
        err(`cursor upload failed: ${e.message}`);
        process.exit(1);
      }
    }
  }

  if (!onlyTool || onlyTool === "antigravity") {
    const since = cursor["ANTIGRAVITY"];
    if (since) info(`antigravity: only events ≥ ${new Date(since).toISOString().slice(0, 19)}Z`);
    const { sessions, warnings } = await parseAntigravity({ sinceMs: since });
    totalParsed += sessions.length;
    for (const w of warnings.slice(0, 3)) warn(w);

    if (sessions.length === 0) {
      info("antigravity: nothing new.");
    } else if (dryRun) {
      printPreview("antigravity", sessions);
    } else {
      try {
        const res = await upload(cfg, sessions);
        ok(`antigravity: uploaded ${res.inserted} / ${res.received} (skipped ${res.skipped} dup).`);
        totalInserted += res.inserted;
        latest["ANTIGRAVITY"] = Math.max(
          latest["ANTIGRAVITY"] ?? 0,
          ...sessions.map((s) => s.startedAt.getTime()),
        );
      } catch (e: any) {
        err(`antigravity upload failed: ${e.message}`);
        process.exit(1);
      }
    }
  }

  if (!dryRun) await saveCursor(latest);

  blank();
  bar("done");
  row("parsed",   totalParsed);
  row("uploaded", dryRun ? "(dry-run)" : totalInserted);

  // Honest disclosure: tell the user about Antigravity's known limitation
  // every time they sync that tool, so 0-token sessions are never a surprise.
  if ((!onlyTool || onlyTool === "antigravity") && !dryRun) {
    blank();
    info(`${c.dim}note: Antigravity sessions land with 0 tokens — Google stores`);
    info(`${c.dim}      transcripts server-side. Heatmap and active-days still work.${c.reset}`);
  }

  // Round-trip to whoami so we always print a true "total in your account" and
  // a clickable URL — this is the answer to "where do I go to see my data?".
  if (!dryRun) {
    try {
      const me = await whoami(cfg);
      blank();
      row("account total", `${me.sessions} sessions`);
      row("dashboard",     `${c.hazard}${cfg.apiUrl}/dashboard${c.reset}`);
      if (me.isPublic) {
        row("public profile", `${c.hazard}${cfg.apiUrl}/u/${me.username}${c.reset}`);
      }
    } catch { /* don't fail the whole sync over a status print */ }
  }
  blank();
}

function printPreview(tool: string, sessions: any[]) {
  const tin = sessions.reduce((s, r) => s + (r.tokensIn ?? 0), 0);
  const tout = sessions.reduce((s, r) => s + (r.tokensOut ?? 0), 0);
  const dur = sessions.reduce((s, r) => s + (r.durationMs ?? 0), 0);
  info(`${tool}: ${sessions.length} sessions · ${fmt(tin)} in · ${fmt(tout)} out · ${(dur / 3.6e6).toFixed(1)}h`);
}

async function cmdLogout() {
  const cfg = await loadConfig();
  if (!cfg) {
    info("Not logged in.");
    return;
  }
  await saveConfig({ apiUrl: cfg.apiUrl, apiKey: "" });
  ok("Cleared local credentials.");
}

async function cmdPreview() {
  const [claude, cursor, antigrav] = await Promise.all([
    parseClaudeCode(),
    parseCursor(),
    parseAntigravity(),
  ]);

  const sessions = [...claude.sessions, ...cursor.sessions, ...antigrav.sessions];
  const warnings = [...claude.warnings, ...cursor.warnings, ...antigrav.warnings];

  const tin = sessions.reduce((s, r) => s + (r.tokensIn ?? 0), 0);
  const tout = sessions.reduce((s, r) => s + (r.tokensOut ?? 0), 0);
  const dur = sessions.reduce((s, r) => s + (r.durationMs ?? 0), 0);
  const days = new Set(sessions.map((r) => r.startedAt.toISOString().slice(0, 10))).size;
  blank();
  bar("local telemetry");
  row("sessions",    sessions.length);
  row("tokens in",   fmt(tin));
  row("tokens out",  fmt(tout));
  row("duration",    `${(dur / 3.6e6).toFixed(1)}H`);
  row("active days", days);
  if (warnings.length) row("warnings", warnings.length);
  blank();
}

async function cmdLeaderboard(rest: string[]) {
  const cfg = await loadConfig();
  if (!cfg?.apiKey) {
    warn("Not logged in. Run `devstats login` first.");
    process.exit(1);
  }

  const period = (flag(rest, "--period") ?? "weekly") as "weekly" | "alltime";
  const metric = (flag(rest, "--metric") ?? "tokens") as
    | "tokens" | "sessions" | "duration" | "lines";
  const top = Number.parseInt(flag(rest, "--top") ?? "10", 10);

  if (!["weekly", "alltime"].includes(period)) {
    err(`bad --period (got "${period}"). Use weekly | alltime.`); process.exit(1);
  }
  if (!["tokens","sessions","duration","lines"].includes(metric)) {
    err(`bad --metric (got "${metric}"). Use tokens | sessions | duration | lines.`);
    process.exit(1);
  }

  try {
    const res = await leaderboard(cfg, period, metric);
    blank();
    bar("leaderboard", `${period.toUpperCase()} · ${metric.toUpperCase()}`);
    if (res.rows.length === 0) {
      info("No public operators yet. Toggle visibility in /settings to be first.");
      blank();
      return;
    }
    const rows = res.rows.slice(0, Number.isFinite(top) ? top : 10);
    const fmtScore = (n: number) =>
      metric === "duration" ? `${(n / 3.6e6).toFixed(1)}H` : fmt(n);

    const widthRank = 5;
    const widthName = Math.max(8, ...rows.map((r) => r.username.length));
    const widthScore = 12;
    console.log(
      `  ${c.dim}${"RANK".padEnd(widthRank)}  ${"OPERATOR".padEnd(widthName)}  ${"SCORE".padStart(widthScore)}  TOOLS${c.reset}`,
    );
    for (const r of rows) {
      const rank = `#${String(r.rank).padStart(3, "0")}`;
      const isMe = r.username === cfg.username;
      const nameColor = isMe ? c.hazard : "";
      console.log(
        `  ${c.bold}${rank.padEnd(widthRank)}${c.reset}  ${nameColor}${r.username.padEnd(widthName)}${c.reset}  ${c.bold}${fmtScore(r.score).padStart(widthScore)}${c.reset}  ${c.dim}${r.tools.map(t => t.replace("_"," ")).join(" · ")}${c.reset}`,
      );
    }
    blank();
    row("page", `${c.hazard}${cfg.apiUrl}/leaderboard${c.reset}`);
    blank();
  } catch (e: any) {
    err(`leaderboard failed: ${e.message}`);
    process.exit(1);
  }
}

async function cmdOpen(rest: string[]) {
  const cfg = await loadConfig();
  if (!cfg) {
    warn("Not logged in. Run `devstats login` first.");
    process.exit(1);
  }
  const target = (rest[0] ?? "dashboard").toLowerCase();
  let path: string;
  switch (target) {
    case "dashboard":   path = "/dashboard"; break;
    case "settings":    path = "/settings"; break;
    case "leaderboard":
    case "lb":          path = "/leaderboard"; break;
    case "profile":
    case "me": {
      const me = await whoami(cfg).catch(() => null);
      if (!me) { err("could not resolve username; is the server up?"); process.exit(1); }
      if (!me.isPublic) {
        warn("Your profile is private — flip it on at /settings first.");
        path = "/settings";
      } else {
        path = `/u/${me.username}`;
      }
      break;
    }
    default:
      err(`unknown target "${target}". Try: dashboard | settings | leaderboard | profile`);
      process.exit(1);
  }
  const url = `${cfg.apiUrl}${path}`;
  const opener =
    process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start"
    : "xdg-open";
  spawn(opener, [url], { detached: true, stdio: "ignore" }).unref();
  info(`Opened ${c.bold}${url}${c.reset}`);
}

function flag(rest: string[], name: string): string | undefined {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
