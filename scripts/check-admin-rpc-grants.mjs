#!/usr/bin/env node
/**
 * Ensures admin/get_admin RPC invoked from browser hooks has GRANT EXECUTE to authenticated.
 * RPCs called only from src/actions/admin/* (BFF) are server-only after migration 20261009120000.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const migrationsDir = join(root, "supabase", "migrations");

const RPC_RE = /supabase\.rpc\(\s*["']((?:admin_|get_admin_)[^"']+)["']/g;

const SERVER_ONLY_DIRS = [
  join(srcDir, "actions", "admin"),
  join(srcDir, "lib"),
];

function walk(dir, acc = [], skipDirs = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (skipDirs.some((d) => path.startsWith(d))) continue;
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(path, acc, skipDirs);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) {
      acc.push(path);
    }
  }
  return acc;
}

const used = new Set();
for (const file of walk(srcDir, [], SERVER_ONLY_DIRS)) {
  const src = readFileSync(file, "utf8");
  let m;
  while ((m = RPC_RE.exec(src)) !== null) {
    used.add(m[1]);
  }
}

const migrationSql = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
  .join("\n");

const hasServerOnlyMigration = migrationSql.includes("admin_rpc_server_only");
const explicitGrants = new Set();
const grantRe = /grant\s+execute\s+on\s+function\s+public\.([a-z0-9_]+)\s*\(/gi;
let g;
while ((g = grantRe.exec(migrationSql)) !== null) {
  explicitGrants.add(g[1]);
}

const missing = [];
for (const rpc of [...used].sort()) {
  if (hasServerOnlyMigration) {
    console.warn(
      `WARN: ${rpc} still called from browser hooks — migrate to src/actions/admin/* BFF`,
    );
    missing.push(rpc);
    continue;
  }
  if (explicitGrants.has(rpc)) continue;
  missing.push(rpc);
}

if (missing.length) {
  console.error("Admin RPCs used in browser src/ (must use BFF ServerFns):");
  for (const rpc of missing) {
    console.error(`  - ${rpc}`);
  }
  process.exit(1);
}

console.log(`OK: no admin RPC direct calls from browser hooks (${used.size} checked).`);
