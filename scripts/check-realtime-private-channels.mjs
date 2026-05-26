#!/usr/bin/env node
/** Fails if any supabase.channel() in src/hooks lacks config.private: true */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "hooks");
const files = readdirSync(root).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

let failed = false;
for (const file of files) {
  const path = join(root, file);
  const src = readFileSync(path, "utf8");
  if (!src.includes(".channel(")) continue;
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(".channel(")) continue;
    const chunk = lines.slice(i, i + 3).join("\n");
    if (!chunk.includes("private: true")) {
      console.error(`${path}:${i + 1}: .channel() missing config.private: true`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("OK: all Realtime channels use private: true");
