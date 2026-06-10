import { createInterface } from "node:readline";

const isTTY = process.stdout.isTTY;
const C = {
  hazard: isTTY ? "\x1b[38;2;255;90;31m" : "",
  ink:    isTTY ? "\x1b[38;2;10;10;10m" : "",
  bold:   isTTY ? "\x1b[1m" : "",
  dim:    isTTY ? "\x1b[2m" : "",
  reset:  isTTY ? "\x1b[0m" : "",
};

export const c = C;

export function bar(label: string, right?: string) {
  const total = 60;
  const left = ` ${label.toUpperCase()} `;
  const pad = Math.max(0, total - left.length - (right ? right.length + 2 : 0));
  console.log(
    `${C.bold}${C.hazard}${left}${C.reset}${C.dim}${"━".repeat(pad)}${C.reset}` +
      (right ? ` ${C.dim}${right}${C.reset}` : ""),
  );
}

export function row(k: string, v: string | number) {
  const key = k.toUpperCase().padEnd(18, " ");
  console.log(`  ${C.dim}${key}${C.reset}${C.bold}${v}${C.reset}`);
}

export function info(s: string) { console.log(`  ${s}`); }
export function ok(s: string)   { console.log(`  ${C.hazard}✓${C.reset} ${s}`); }
export function warn(s: string) { console.log(`  ${C.hazard}!${C.reset} ${s}`); }
export function err(s: string)  { console.error(`  ${C.hazard}✗${C.reset} ${s}`); }

export function blank() { console.log(); }

export function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

export function prompt(question: string, opts: { hidden?: boolean } = {}): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    if (opts.hidden) {
      const stdin = process.stdin as any;
      const onData = (buf: Buffer) => {
        const s = buf.toString("utf8");
        if (s === "\n" || s === "\r" || s === "\r\n" || s === "") {
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
        } else {
          process.stdout.write("*");
        }
      };
      stdin.on("data", onData);
    }
    rl.question(`${question} `, (a) => {
      rl.close();
      resolve(a.trim());
    });
  });
}
