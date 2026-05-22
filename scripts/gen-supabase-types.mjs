import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "src/integrations/supabase/types.generated.ts");

const banner = `/**
 * Auto-generated — do not edit by hand.
 * Regenerate: npm run db:types
 * Subconjunto manual em types.ts.
 */
`;

const raw = execSync("npx supabase gen types --linked --lang=typescript", {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});

const start = raw.indexOf("export type Json");
if (start < 0) {
  console.error("Unexpected CLI output — 'export type Json' not found");
  process.exit(1);
}

writeFileSync(outPath, banner + raw.slice(start), "utf8");
console.log(`Wrote ${outPath}`);
