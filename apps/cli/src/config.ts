import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DIR = join(homedir(), ".devstats");
const CONFIG_PATH = join(DIR, "config.json");
const CURSOR_PATH = join(DIR, "cursor.json");

export interface CliConfig {
  apiKey: string;
  apiUrl: string;
  username?: string;
}

export interface CursorState {
  // ms since epoch — only events at/after this timestamp are uploaded
  [tool: string]: number;
}

async function ensureDir() {
  if (!existsSync(DIR)) await mkdir(DIR, { recursive: true, mode: 0o700 });
}

export async function loadConfig(): Promise<CliConfig | null> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveConfig(cfg: CliConfig) {
  await ensureDir();
  await writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

export async function clearConfig() {
  await ensureDir();
  try {
    await writeFile(CONFIG_PATH, "{}", { mode: 0o600 });
  } catch {
    /* ignore */
  }
}

export async function loadCursor(): Promise<CursorState> {
  try {
    const raw = await readFile(CURSOR_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveCursor(c: CursorState) {
  await ensureDir();
  await writeFile(CURSOR_PATH, JSON.stringify(c, null, 2), { mode: 0o600 });
}

export const PATHS = { DIR, CONFIG_PATH, CURSOR_PATH };
