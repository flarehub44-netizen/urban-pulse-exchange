#!/usr/bin/env node
/**
 * CI guard: migrations from 2026-11-01 onward must REVOKE before GRANT EXECUTE (default-deny).
 * Remote verification: supabase/tests/security_anon_execute_must_be_zero.sql (expect 0 rows).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");
const CUTOFF = "20261101000000";

const EXCLUDE = new Set([
  "20261108000000_security_advisor_remediation.sql",
]);

const grantRe = /grant\s+execute\s+on\s+function\s+public\.([a-z0-9_]+)\s*\(/gi;
const revokeRe = /revoke\s+execute\s+on\s+function\s+public\.([a-z0-9_]+)\s*\(/gi;

const issues = [];

for (const file of readdirSync(migrationsDir).filter(
  (f) => f.endsWith(".sql") && f >= CUTOFF && !EXCLUDE.has(f),
)) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  const revokes = new Set();
  let m;
  while ((m = revokeRe.exec(sql)) !== null) {
    revokes.add(m[1]);
  }
  grantRe.lastIndex = 0;
  while ((m = grantRe.exec(sql)) !== null) {
    if (!revokes.has(m[1])) {
      issues.push({ file, fn: m[1] });
    }
  }
}

if (issues.length) {
  console.error(
    "GRANT EXECUTE without matching REVOKE in the same migration (use default-deny):",
  );
  for (const { file, fn } of issues) {
    console.error(`  - ${file}: public.${fn}(...)`);
  }
  console.error(
    "\nPattern: revoke execute on function public.foo(...) from public, anon, authenticated;",
  );
  process.exit(1);
}

console.log(
  `OK: RPC grants since ${CUTOFF} include matching REVOKE (${issues.length} issues).`,
);
