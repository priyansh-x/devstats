import { defineConfig } from "tsup";

/**
 * The CLI publishes as `devstats-cli` on npm. To make `npm i -g devstats-cli`
 * actually work we have to:
 *
 *   1. Inline our workspace packages (`@devstats/parsers`, `@devstats/types`)
 *      into the dist. They're never published themselves.
 *   2. Keep `better-sqlite3` external. It's a native binding — every consumer
 *      installs the prebuilt for their OS / Node version.
 *   3. Emit a shebang as the *first* line, then chmod +x in a postbuild step.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  minify: false,
  sourcemap: false,
  dts: false,
  splitting: false,
  shims: false,
  banner: { js: "#!/usr/bin/env node" },
  noExternal: ["@devstats/parsers", "@devstats/types"],
  external: ["better-sqlite3"],
});
