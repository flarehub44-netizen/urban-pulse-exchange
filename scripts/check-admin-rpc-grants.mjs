#!/usr/bin/env node
/**
 * Ensures every admin/get_admin RPC invoked from src/ has GRANT EXECUTE to authenticated
 * in migrations (explicit grant or bulk repair migration 20260830120000_*).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const migrationsDir = join(root, "supabase", "migrations");

const RPC_RE = /supabase\.rpc\(\s*["']((?:admin_|get_admin_)[^"']+)["']/g;

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(path, acc);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) {
      acc.push(path);
    }
  }
  return acc;
}

const used = new Set();
for (const file of walk(srcDir)) {
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

const hasBulkRepair = migrationSql.includes("restore_admin_rpc_execute_grants");
const explicitGrants = new Set();
const grantRe = /grant\s+execute\s+on\s+function\s+public\.([a-z0-9_]+)\s*\(/gi;
let g;
while ((g = grantRe.exec(migrationSql)) !== null) {
  explicitGrants.add(g[1]);
}

const missing = [];
for (const rpc of [...used].sort()) {
  if (explicitGrants.has(rpc)) continue;
  if (
    hasBulkRepair &&
    (rpc.startsWith("admin_") || rpc.startsWith("get_admin_"))
  ) {
    continue;
  }
  missing.push(rpc);
}

if (missing.length) {
  console.error("Admin RPCs used in src/ without GRANT EXECUTE coverage in migrations:");
  for (const rpc of missing) {
    console.error(`  - ${rpc}`);
  }
  console.error(
    "\nAdd GRANT EXECUTE ... TO authenticated in the same migration as the function,",
  );
  console.error("or ensure restore_admin_rpc_execute_grants migration is present.");
  process.exit(1);
}

console.log(`OK: ${used.size} admin RPC(s) in src/ covered by migration grants.`);
