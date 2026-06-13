// shebang is added by tsup's banner config at build time; in dev we go
// through `tsx src/index.ts` so it's never needed here.
import { parseClaudeCode, parseCursor, parseAntigravity, parseWindsurf, parseCodex } from "@devstats/parsers";
import { loadConfig, saveConfig, loadCursor, saveCursor, PATHS } from "./config.js";
import { c, bar, row, ok, warn, err, info, blank, fmt, prompt } from "./ui.js";
import {
  whoami, upload, leaderboard, publicProfile,
  squadList, squadCreate, squadJoin, squadLeave, squadStandings,
} from "./api.js";
import { spawn } from "node:child_process";

const DEFAULT_API_URL = process.env.DEVSTATS_URL ?? "https://devstats-x.vercel.app";
const args = process.argv.slice(2);
const cmd = args[0] ?? "help";

async function main() {
  switch (cmd) {
    case "login":       return cmdLogin();
    case "whoami":      return cmdWhoami(args.slice(1));
    case "status":      return cmdStatus();
    case "config":      return cmdConfig(args.slice(1));
    case "sync":        return cmdSync(args.slice(1));
    case "preview":     return cmdPreview();
    case "profile":     return cmdProfile(args.slice(1));
    case "dashboard":   return cmdDashboard();
    case "leaderboard":
    case "lb":          return cmdLeaderboard(args.slice(1));
    case "open":        return cmdOpen(args.slice(1));
    case "squad":       return cmdSquad(args.slice(1));
    case "doctor":      return cmdDoctor(args.slice(1));
    case "logout":      return cmdLogout();
    case "-v":
    case "--version":
      console.log("devstats-cli 0.1.1");
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
  devstats dashboard                   render your dashboard summary in this terminal
  devstats profile [handle]            render an operator's public profile in this terminal
                                       (defaults to your own handle)
  devstats leaderboard [flags]         fetch + print the public leaderboard
  devstats open [page]                 actually open dashboard / settings / leaderboard
                                       in your browser
  devstats squad list                  your squads + invite codes
  devstats squad create <name>         create a squad, get an invite code
  devstats squad join <code>           join with an invite code
  devstats squad <slug>                squad standings in the terminal
  devstats squad leave <slug>          leave (last member out deletes it)
  devstats doctor [--report]           diagnose local tool detection / parsing
  devstats config                      show local config (key masked)
  devstats config set url <url>        point the CLI at a different host
  devstats logout                      remove stored credentials

${c.bold}sync flags:${c.reset}
  --dry-run                            parse + summarize, never upload
  --full                               ignore the local cursor and reupload everything
  --tool <name>                        restrict to one parser
                                       (claude-code | cursor | antigravity | windsurf | codex)

${c.bold}leaderboard flags:${c.reset}
  --period daily|weekly|monthly|alltime    default: weekly
  --metric tokens|sessions|duration|lines  default: tokens
  --top N                              default: 10

${c.bold}scripting:${c.reset}
  --json                               on whoami / leaderboard / profile,
                                       print raw JSON instead of tables

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

async function cmdWhoami(rest: string[] = []) {
  const cfg = await loadConfig();
  if (!cfg?.apiKey) {
    warn("Not logged in. Run `devstats login` first.");
    process.exit(1);
  }
  try {
    const me = await whoami(cfg);
    if (rest.includes("--json")) {
      console.log(JSON.stringify(me, null, 2));
      return;
    }
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
  const errors: { tool: string; phase: "parse" | "upload"; message: string }[] = [];

  const tools: { name: string; key: string; parse: (opts?: any) => Promise<{ sessions: any[]; warnings: string[] }> }[] = [
    { name: "claude-code", key: "CLAUDE_CODE", parse: (o) => parseClaudeCode(o) },
    { name: "cursor",      key: "CURSOR",      parse: (o) => parseCursor(o) },
    { name: "antigravity", key: "ANTIGRAVITY", parse: (o) => parseAntigravity(o) },
    { name: "windsurf",    key: "WINDSURF",    parse: (o) => parseWindsurf(o) },
    { name: "codex",       key: "CODEX",       parse: (o) => parseCodex(o) },
  ];

  for (const tool of tools) {
    if (onlyTool && onlyTool !== tool.name) continue;

    const since = cursor[tool.key];
    if (since) info(`${tool.name}: only events ≥ ${new Date(since).toISOString().slice(0, 19)}Z`);

    let sessions: any[];
    let warnings: string[];
    try {
      const r = await tool.parse({ sinceMs: since });
      sessions = r.sessions;
      warnings = r.warnings;
    } catch (e: any) {
      errors.push({ tool: tool.name, phase: "parse", message: e.message });
      err(`${tool.name}: parse failed — ${e.message}`);
      continue;
    }

    totalParsed += sessions.length;
    for (const w of warnings.slice(0, 3)) warn(w);

    if (sessions.length === 0) {
      info(`${tool.name}: nothing new.`);
    } else if (dryRun) {
      printPreview(tool.name, sessions);
    } else {
      try {
        const res = await upload(cfg, sessions);
        ok(`${tool.name}: uploaded ${res.inserted} / ${res.received} (skipped ${res.skipped} dup).`);
        totalInserted += res.inserted;
        latest[tool.key] = Math.max(
          latest[tool.key] ?? 0,
          ...sessions.map((s) => s.startedAt.getTime()),
        );
      } catch (e: any) {
        errors.push({ tool: tool.name, phase: "upload", message: e.message });
        err(`${tool.name}: upload failed — ${e.message}`);
        if (e.message.includes("401") || e.message.includes("403")) {
          err("Auth error — remaining tools skipped. Check your API key with `devstats login`.");
          break;
        }
      }
    }
  }

  if (!dryRun) await saveCursor(latest);

  blank();
  bar("done");
  row("parsed",   totalParsed);
  row("uploaded", dryRun ? "(dry-run)" : totalInserted);

  if (errors.length > 0) {
    blank();
    bar("errors", `${errors.length}`);
    for (const e of errors) {
      err(`${e.tool} (${e.phase}): ${e.message}`);
    }
    info(`Run ${c.bold}devstats doctor${c.reset} for diagnostics, or retry with ${c.bold}--tool <name>${c.reset}.`);
  }

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

  if (errors.length > 0) process.exit(1);
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
  const [claude, cursor, antigrav, windsurf, codex] = await Promise.all([
    parseClaudeCode(),
    parseCursor(),
    parseAntigravity(),
    parseWindsurf(),
    parseCodex(),
  ]);

  const sessions = [...claude.sessions, ...cursor.sessions, ...antigrav.sessions, ...windsurf.sessions, ...codex.sessions];
  const warnings = [...claude.warnings, ...cursor.warnings, ...antigrav.warnings, ...windsurf.warnings, ...codex.warnings];

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

  const period = (flag(rest, "--period") ?? "weekly") as
    | "daily" | "weekly" | "monthly" | "alltime";
  const metric = (flag(rest, "--metric") ?? "tokens") as
    | "tokens" | "sessions" | "duration" | "lines";
  const top = Number.parseInt(flag(rest, "--top") ?? "10", 10);

  if (!["daily", "weekly", "monthly", "alltime"].includes(period)) {
    err(`bad --period (got "${period}"). Use daily | weekly | monthly | alltime.`);
    process.exit(1);
  }
  if (!["tokens","sessions","duration","lines"].includes(metric)) {
    err(`bad --metric (got "${metric}"). Use tokens | sessions | duration | lines.`);
    process.exit(1);
  }

  try {
    const res = await leaderboard(cfg, period, metric);
    if (rest.includes("--json")) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }
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

/**
 * Squads — private team leaderboards.
 *   devstats squad list | create <name> | join <code> | leave <slug> | <slug>
 */
async function cmdSquad(rest: string[]) {
  const cfg = await loadConfig();
  if (!cfg?.apiKey) {
    warn("Not logged in. Run `devstats login` first.");
    process.exit(1);
  }
  const sub = rest[0];

  try {
    if (!sub || sub === "list") {
      const { squads } = await squadList(cfg);
      blank();
      bar("squads", `${squads.length}`);
      if (squads.length === 0) {
        info("No squads yet. Create one: devstats squad create <name>");
      } else {
        for (const s of squads) {
          row(s.slug, `${s.name} · ${s.memberCount} member${s.memberCount === 1 ? "" : "s"} · code ${s.inviteCode}`);
        }
      }
      blank();
      return;
    }

    if (sub === "create") {
      const name = rest.slice(1).join(" ").trim();
      if (!name) { err("Usage: devstats squad create <name>"); process.exit(1); }
      const s = await squadCreate(cfg, name);
      blank();
      ok(`Created ${c.bold}${s.name}${c.reset}.`);
      row("invite code", `${c.hazard}${s.inviteCode}${c.reset}`);
      row("share", `friends run: devstats squad join ${s.inviteCode}`);
      row("board", `${cfg.apiUrl}/squads/${s.slug}`);
      blank();
      return;
    }

    if (sub === "join") {
      const code = rest[1];
      if (!code) { err("Usage: devstats squad join <code>"); process.exit(1); }
      const s = await squadJoin(cfg, code);
      ok(`Joined ${c.bold}${s.name}${c.reset}. Standings: devstats squad ${s.slug}`);
      return;
    }

    if (sub === "leave") {
      const slug = rest[1];
      if (!slug) { err("Usage: devstats squad leave <slug>"); process.exit(1); }
      await squadLeave(cfg, slug);
      ok(`Left ${slug}.`);
      return;
    }

    // Anything else is treated as a slug → print standings.
    const period = flag(rest, "--period") ?? "weekly";
    const metric = flag(rest, "--metric") ?? "tokens";
    const data = await squadStandings(cfg, sub, period, metric);
    if (rest.includes("--json")) { console.log(JSON.stringify(data, null, 2)); return; }
    blank();
    bar(data.squad.name, `${period} · ${metric}`);
    if (data.rows.length === 0) {
      info("No activity in this window. First to sync takes #1.");
    } else {
      for (const r of data.rows) {
        const me = cfg.username && r.username === cfg.username;
        const crown = r.rank === 1 ? "👑 " : "   ";
        const line = `${crown}#${String(r.rank).padEnd(3)} ${r.username.padEnd(20)} ${fmt(r.score).padStart(10)}`;
        console.log(me ? `  ${c.hazard}${line} ← you${c.reset}` : `  ${line}`);
      }
    }
    blank();
    row("invite code", data.squad.inviteCode);
    row("board", `${cfg.apiUrl}/squads/${data.squad.slug}`);
    blank();
  } catch (e: any) {
    err(`squad: ${e.message}`);
    process.exit(1);
  }
}

/**
 * `devstats doctor` — diagnose what the parsers can (and can't) see on this
 * machine. The first thing to run when "my data doesn't show up". `--report`
 * writes an anonymized JSON bundle (counts, paths, warnings — never message
 * content) to attach to a GitHub issue.
 */
async function cmdDoctor(rest: string[]) {
  const report: Record<string, any> = {
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    nodeVersion: process.version,
    cliVersion: "0.1.1",
    tools: {},
  };

  blank();
  bar("devstats doctor", process.platform);

  const checks: { name: string; key: string; run: () => Promise<{ sessions: any[]; warnings: string[] }> }[] = [
    { name: "claude-code", key: "CLAUDE_CODE", run: () => parseClaudeCode() },
    { name: "cursor",      key: "CURSOR",      run: () => parseCursor() },
    { name: "antigravity", key: "ANTIGRAVITY", run: () => parseAntigravity() },
    { name: "windsurf",    key: "WINDSURF",    run: () => parseWindsurf() },
    { name: "codex",       key: "CODEX",       run: () => parseCodex() },
  ];

  for (const check of checks) {
    let sessions: any[] = [];
    let warnings: string[] = [];
    let error: string | null = null;
    const t0 = Date.now();
    try {
      const r = await check.run();
      sessions = r.sessions;
      warnings = r.warnings;
    } catch (e: any) {
      error = e.message;
    }
    const ms = Date.now() - t0;

    const detected = sessions.length > 0 || warnings.length > 0;
    const dates = sessions.map((s) => s.startedAt.getTime());
    const tin = sessions.reduce((a, s) => a + (s.tokensIn ?? 0), 0);
    const summary = {
      detected,
      sessions: sessions.length,
      tokensIn: tin,
      firstSession: dates.length ? new Date(Math.min(...dates)).toISOString().slice(0, 10) : null,
      lastSession:  dates.length ? new Date(Math.max(...dates)).toISOString().slice(0, 10) : null,
      warnings,
      error,
      parseMs: ms,
    };
    report.tools[check.key] = summary;

    blank();
    if (error) {
      err(`${check.name}: parser crashed — ${error}`);
    } else if (sessions.length > 0) {
      ok(`${check.name}: ${sessions.length} sessions · ${fmt(tin)} tokens in · ${summary.firstSession} → ${summary.lastSession} (${ms}ms)`);
    } else if (warnings.length > 0) {
      warn(`${check.name}: detected but 0 sessions parsed (${ms}ms)`);
    } else {
      info(`${check.name}: not installed (or no data) — skipped.`);
    }
    for (const w of warnings) warn(`  ${w}`);
  }

  // Connectivity + auth.
  blank();
  const cfg = await loadConfig();
  if (!cfg?.apiKey) {
    warn("auth: not logged in (devstats login)");
    report.auth = { loggedIn: false };
  } else {
    try {
      const me = await whoami(cfg);
      ok(`auth: signed in as ${me.username} · ${me.sessions} sessions on ${cfg.apiUrl}`);
      report.auth = { loggedIn: true, apiUrl: cfg.apiUrl, remoteSessions: me.sessions };
    } catch (e: any) {
      err(`auth: can't reach ${cfg.apiUrl} — ${e.message}`);
      report.auth = { loggedIn: true, apiUrl: cfg.apiUrl, error: e.message };
    }
  }

  if (rest.includes("--report")) {
    const { writeFile } = await import("node:fs/promises");
    const path = `devstats-doctor-${Date.now()}.json`;
    await writeFile(path, JSON.stringify(report, null, 2));
    blank();
    ok(`Wrote ${path} — attach it to a GitHub issue.`);
    info("Contains counts, dates, and warnings only. Never message content or paths' contents.");
  }
  blank();
}

/**
 * `devstats config`              — show local config (API key masked)
 * `devstats config set url <u>`  — repoint the CLI at a different host
 *
 * Beats hand-editing ~/.devstats/config.json, which is how everyone was
 * switching ports during local dev.
 */
async function cmdConfig(rest: string[]) {
  const cfg = await loadConfig();

  if (rest.length === 0) {
    blank();
    bar("config", PATHS.CONFIG_PATH);
    if (!cfg?.apiKey) {
      info("Not logged in.");
    } else {
      row("api url",  cfg.apiUrl);
      row("operator", cfg.username ?? "—");
      row("api key",  `ds_live_…${cfg.apiKey.slice(-4)}`);
    }
    blank();
    info(`Change the host: ${c.bold}devstats config set url <url>${c.reset}`);
    blank();
    return;
  }

  if (rest[0] === "set" && rest[1] === "url" && rest[2]) {
    if (!cfg?.apiKey) {
      warn("Not logged in. Run `devstats login` first (it stores the URL too).");
      process.exit(1);
    }
    const url = rest[2].replace(/\/+$/, "");
    await saveConfig({ ...cfg, apiUrl: url });
    ok(`API URL → ${c.bold}${url}${c.reset}`);
    // Sanity-probe the new host so a typo is caught immediately.
    try {
      const me = await whoami({ ...cfg, apiUrl: url });
      ok(`Verified — signed in as ${c.bold}${me.username}${c.reset}.`);
    } catch (e: any) {
      warn(`Saved, but the probe failed: ${e.message}`);
      warn("Check the URL or re-run `devstats login`.");
    }
    return;
  }

  err(`unknown config command. Use:\n  devstats config\n  devstats config set url <url>`);
  process.exit(1);
}

/** Render the signed-in operator's dashboard as a spec sheet right here. */
async function cmdDashboard() {
  const cfg = await loadConfig();
  if (!cfg?.apiKey) {
    warn("Not logged in. Run `devstats login` first.");
    process.exit(1);
  }
  try {
    const me = await whoami(cfg);
    blank();
    bar("dashboard", me.username);
    row("email",         me.email);
    row("visibility",    me.isPublic ? "PUBLIC" : "PRIVATE");
    row("sessions",      me.sessions);
    row("tokens in",     fmt(me.tokensIn));
    row("tokens out",    fmt(me.tokensOut));
    row("last sync",     me.lastSyncAt?.slice(0, 19).replace("T", " ") ?? "—");
    blank();
    row("note", `${c.dim}for the full heatmap + breakdowns, run ${c.bold}devstats open${c.reset}`);
    row("page", `${c.hazard}${cfg.apiUrl}/dashboard${c.reset}`);
    blank();
  } catch (e: any) {
    err(`dashboard failed: ${e.message}`);
    process.exit(1);
  }
}

/** Render a public operator's profile (defaults to self if public). */
async function cmdProfile(rest: string[]) {
  const cfg = await loadConfig();
  if (!cfg?.apiKey) {
    warn("Not logged in. Run `devstats login` first.");
    process.exit(1);
  }

  const asJson = rest.includes("--json");
  let handle = rest.filter((a) => !a.startsWith("--"))[0];
  if (!handle) {
    const me = await whoami(cfg).catch(() => null);
    if (!me) { err("could not resolve your handle. Try `devstats profile <username>` directly."); process.exit(1); }
    if (!me.isPublic) {
      blank();
      warn(`Your profile is private — no public stats to render.`);
      info(`Toggle to public in ${c.bold}${cfg.apiUrl}/settings${c.reset}, or pass a handle:`);
      info(`  ${c.dim}devstats profile <username>${c.reset}`);
      blank();
      return;
    }
    handle = me.username;
  }

  let p;
  try {
    p = await publicProfile(cfg, handle);
  } catch (e: any) {
    err(`profile failed: ${e.message}`);
    process.exit(1);
  }

  if (asJson) {
    console.log(JSON.stringify(p, null, 2));
    return;
  }

  blank();
  bar("operator", p.username);
  row("public since",  p.createdAt.slice(0, 10));
  row("sessions",      p.stats.totals.sessions);
  row("tokens in",     fmt(p.stats.totals.tokensIn));
  row("tokens out",    fmt(p.stats.totals.tokensOut));
  row("duration",      `${(p.stats.totals.durationMs / 3.6e6).toFixed(1)}H`);
  row("active days",   p.stats.totals.activeDays);
  row("streak",        `${p.stats.streak.current}D · longest ${p.stats.streak.longest}D`);
  blank();

  if (p.stats.toolBreakdown.length) {
    bar("tools");
    for (const t of p.stats.toolBreakdown) {
      row(t.tool.replace("_"," "), `${t.sessions} sessions · ${fmt(t.tokens)} tkn`);
    }
    blank();
  }

  if (p.stats.topModels.length) {
    bar("top models");
    for (const m of p.stats.topModels.slice(0, 5)) {
      row(m.model, `${m.sessions} sessions · ${fmt(m.tokens)} tkn`);
    }
    blank();
  }

  row("profile url", `${c.hazard}${cfg.apiUrl}/u/${p.username}${c.reset}`);
  blank();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
