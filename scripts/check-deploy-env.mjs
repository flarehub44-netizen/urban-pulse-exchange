#!/usr/bin/env node
/**
 * Validates required deploy env var NAMES are documented (no secret values).
 * Usage: node scripts/check-deploy-env.mjs [.env.local]
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = process.argv[2] ?? join(root, ".env.local");
const exampleFile = join(root, ".env.example");

const REQUIRED = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const WORKER_ONLY = [
  "CRON_SECRET",
  "CRON_HMAC_SECRET",
  "VELOCITY_HMAC_SECRET",
  "SYNCPAY_WEBHOOK_SECRET",
  "SYNCPAY_API_KEY",
];

function parseEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = parseEnv(envFile);
const example = parseEnv(exampleFile);

const missing = REQUIRED.filter((k) => !env[k]?.length);
const undocumented = [...REQUIRED, ...WORKER_ONLY].filter((k) => !(k in example) && k.startsWith("VITE_") === false);

if (missing.length && existsSync(envFile)) {
  console.error(`Missing in ${envFile}:`);
  for (const k of missing) console.error(`  - ${k}`);
  process.exit(1);
}

if (undocumented.length) {
  console.warn("Consider adding to .env.example:", undocumented.join(", "));
}

console.log(`OK: deploy env check (${Object.keys(env).length} vars in ${envFile}).`);
