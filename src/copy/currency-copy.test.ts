import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(import.meta.dirname, "..");
const EXCLUDED_FILES = new Set([
  join(SRC_ROOT, "copy", "currency-copy.test.ts"),
  join(SRC_ROOT, "lib", "parimutuel.test.ts"),
]);

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "integrations") continue;
      out.push(...collectSourceFiles(path));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (EXCLUDED_FILES.has(path)) continue;
    out.push(path);
  }
  return out;
}

describe("currency copy — no R$ symbol in UI source", () => {
  it("pt-BR copy has no R$", () => {
    const content = readFileSync(join(SRC_ROOT, "copy", "pt-BR.ts"), "utf8");
    expect(content).not.toMatch(/R\$/);
  });

  it("src ts/tsx files have no R$ (except currency regression tests)", () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(SRC_ROOT)) {
      const content = readFileSync(file, "utf8");
      if (/R\$/.test(content)) offenders.push(file.replace(SRC_ROOT + "\\", "").replace(SRC_ROOT + "/", ""));
    }
    expect(offenders).toEqual([]);
  });
});
