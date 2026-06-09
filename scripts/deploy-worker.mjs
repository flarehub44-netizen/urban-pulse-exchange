#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lovableConfig = join(root, "dist", "server", "wrangler.json");
const config = existsSync(lovableConfig) ? lovableConfig : join(root, "wrangler.production.jsonc");

if (!existsSync(lovableConfig) && !existsSync(join(root, "dist", "server", "server.js"))) {
  console.error("Missing dist/server/server.js — run npm run build first");
  process.exit(1);
}

console.log(`Deploying Worker with config: ${config}`);
const result = spawnSync("npx", ["wrangler", "deploy", "--config", config], {
  stdio: "inherit",
  cwd: root,
});
process.exit(result.status ?? 1);
