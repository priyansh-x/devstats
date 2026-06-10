// shebang is added by tsup's banner config at build time; in dev we go
// through `tsx src/index.ts` so it's never needed here.
import { parseClaudeCode, parseCursor, parseAntigravity } from "@devstats/parsers";
import { loadConfig, saveConfig, loadCursor, saveCursor, PATHS } from "./config.js";
import { c, bar, row, ok, warn, err, info, blank, fmt, prompt } from "./ui.js";
import { whoami, upload } from "./api.js";

const DEFAULT_API_URL = process.env.DEVSTATS_URL ?? "http://localhost:3000";
const args = process.argv.slice(2);
const cmd = args[0] ?? "help";

async function main() {
  switch (cmd) {
    case "login":   return cmdLogin();
    case "whoami":  return cmdWhoami();
    case "status":  return cmdStatus();
    case "sync":    return cmdSync(args.slice(1));
    case "logout":  return cmdLogout();
    case "preview": return cmdPreview();
    case "-v":
    case "--version":
      console.log("devstats-cli 0.0.1");
      return;
    case "help":
    case "--help":
    case "-h":
    default:        return cmdHelp();
  }
}

function cmdHelp() {
  console.log(`${c.bold}devstats${c.reset} — telemetry for AI coding tools

usage:
  devstats login              authenticate (paste your API key)
  devstats whoami             show current operator
  devstats status             local sync state + remote totals
  devstats sync [--dry-run] [--tool claude-code|cursor|antigravity] [--full]
                              parse and upload (delta) sessions
  devstats preview            parse local logs, print spec sheet (no upload)
  devstats logout             remove stored credentials

  --dry-run                   parse + summarize, never upload
  --full                      ignore the local cursor and reupload everything
  --tool <name>               restrict to one parser (claude-code | cursor | antigravity)

env:
  DEVSTATS_URL                override the API host (default ${DEFAULT_API_URL})

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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
