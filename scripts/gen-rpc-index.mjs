import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function walk(dir, test, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, test, acc);
    else if (test(p)) acc.push(p);
  }
  return acc;
}

const migrationFiles = walk(path.join(root, "supabase", "migrations"), (p) => p.endsWith(".sql"));
const srcFiles = walk(path.join(root, "src"), (p) => /\.(ts|tsx)$/.test(p));

const functions = [];
for (const file of migrationFiles) {
  const text = fs.readFileSync(file, "utf8");
  const re = /create\s+or\s+replace\s+function\s+([\w.]+)/gi;
  let m;
  while ((m = re.exec(text))) {
    functions.push({ fn: m[1], file: path.relative(root, file).replace(/\\/g, "/") });
  }
}

const rpcUses = [];
for (const file of srcFiles) {
  const text = fs.readFileSync(file, "utf8");
  const re = /\.rpc\(\s*["']([\w_]+)["']/g;
  let m;
  while ((m = re.exec(text))) {
    rpcUses.push({ rpc: m[1], file: path.relative(root, file).replace(/\\/g, "/") });
  }
}

const byRpc = new Map();
for (const u of rpcUses) {
  if (!byRpc.has(u.rpc)) byRpc.set(u.rpc, new Set());
  byRpc.get(u.rpc).add(u.file);
}

const lines = [
  "# RPC Index",
  "",
  "Gerado por `scripts/gen-rpc-index.mjs`.",
  "",
  "## Functions em migrations",
  "",
];

for (const row of functions.sort((a, b) => a.fn.localeCompare(b.fn))) {
  lines.push(`- \`${row.fn}\` — ${row.file}`);
}

lines.push("", "## Uso de .rpc() no src", "");
for (const [rpc, files] of [...byRpc.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  lines.push(`- \`${rpc}\``);
  for (const f of [...files].sort()) lines.push(`  - ${f}`);
}

fs.writeFileSync(path.join(root, "docs", "RPC_INDEX.md"), lines.join("\n") + "\n", "utf8");
console.log("Wrote docs/RPC_INDEX.md");
