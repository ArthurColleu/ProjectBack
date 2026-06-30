// Copies non-TypeScript runtime assets (SQL migrations) into dist/,
// because `tsc` only emits .js and leaves .sql files behind.
import { cpSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const from = resolve(root, "src/db/migrations");
const to = resolve(root, "dist/db/migrations");

if (!existsSync(from)) {
  console.error(`[copy-assets] source not found: ${from}`);
  process.exit(1);
}

cpSync(from, to, { recursive: true });
console.log(`[copy-assets] migrations copied → ${to}`);
