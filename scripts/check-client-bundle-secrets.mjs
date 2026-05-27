#!/usr/bin/env node
/**
 * Fails if server-only Supabase secrets or imports appear in client-facing source.
 * Run: node scripts/check-client-bundle-secrets.mjs
 * Optional: node scripts/check-client-bundle-secrets.mjs dist/client  (scan build output)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scanRoot = process.argv[2] ? join(root, process.argv[2]) : join(root, "src");

const FORBIDDEN_SNIPPETS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "service_role",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", // only flag if paired with service_role in same file - handled below
];

const FORBIDDEN_IMPORTS = ["integrations/supabase/client.server", "supabase/client.server"];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(path, out);
    } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

const ALLOW_SERVICE_ROLE_MENTION = new Set([
  "src/lib/supabase-key-guard.ts",
]);

function isServerOnlyFile(rel) {
  return (
    rel.includes(".server.") ||
    rel.startsWith("src/actions/") ||
    rel.startsWith("src/routes/api/") ||
    rel === "src/server.ts"
  );
}

let failed = false;
const files = walk(scanRoot);

for (const path of files) {
  const rel = relative(root, path).replace(/\\/g, "/");
  const src = readFileSync(path, "utf8");
  const clientFacing = !isServerOnlyFile(rel);

  if (clientFacing) {
    if (src.includes("SUPABASE_SERVICE_ROLE_KEY") && !ALLOW_SERVICE_ROLE_MENTION.has(rel)) {
      console.error(`${rel}: must not reference SUPABASE_SERVICE_ROLE_KEY in client code`);
      failed = true;
    }
    for (const imp of FORBIDDEN_IMPORTS) {
      if (src.includes(imp)) {
        console.error(`${rel}: imports server-only module (${imp})`);
        failed = true;
      }
    }
    if (/role['"]\s*:\s*['"]service_role['"]/.test(src)) {
      console.error(`${rel}: contains embedded service_role JWT claim`);
      failed = true;
    }
  }

  if (
    scanRoot.endsWith("src") &&
    /import\.meta\.env\.VITE_[A-Z0-9_]*SERVICE_ROLE/.test(src)
  ) {
    console.error(`${rel}: VITE_* must not reference SERVICE_ROLE`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`OK: no server secrets in ${relative(root, scanRoot) || "src"}`);
