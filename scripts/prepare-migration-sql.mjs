import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
if (!file) {
  console.error("Usage: node prepare-migration-sql.mjs <migration.sql>");
  process.exit(1);
}
const src = readFileSync(join(root, file), "utf8");
const out = src.replace(/\$\$/g, "$fn$");
writeFileSync(join(root, ".tmp-migration.sql"), out);
console.log("Wrote .tmp-migration.sql", out.length, "bytes");
