/**
 * Load test: concurrent place_bet via Supabase RPC (staging only).
 *
 * Usage:
 *   DATABASE_URL=... SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... \
 *   PLAYWRIGHT_TEST_EMAIL=... PLAYWRIGHT_TEST_PASSWORD=... \
 *   node scripts/load/place-bet-k6.mjs
 *
 * Requires a live demo market id (default: first *-live market).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const email = process.env.PLAYWRIGHT_TEST_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 10);
const marketId = process.env.LOAD_MARKET_ID;

if (!url || !key || !email || !password) {
  console.error("Missing SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, PLAYWRIGHT_TEST_*");
  process.exit(1);
}

const client = createClient(url, key);
const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
if (signInErr) {
  console.error("Sign in failed:", signInErr.message);
  process.exit(1);
}

let targetMarket = marketId;
if (!targetMarket) {
  const { data: markets } = await client
    .from("markets")
    .select("id")
    .eq("status", "live")
    .like("id", "%-live")
    .limit(1);
  targetMarket = markets?.[0]?.id;
}
if (!targetMarket) {
  console.error("No live demo market found — set LOAD_MARKET_ID");
  process.exit(1);
}

const { data: profileBefore } = await client
  .from("profiles")
  .select("balance")
  .eq("id", (await client.auth.getUser()).data.user?.id)
  .single();

console.log(`Market: ${targetMarket}, balance before: ${profileBefore?.balance}, concurrency: ${concurrency}`);

const started = Date.now();
const results = await Promise.all(
  Array.from({ length: concurrency }, (_, i) =>
    client.rpc("place_bet", {
      p_market_id: targetMarket,
      p_side: i % 2 === 0 ? "YES" : "NO",
      p_stake: 1,
      p_idempotency_key: crypto.randomUUID(),
    }),
  ),
);

const ok = results.filter((r) => !r.error).length;
const failed = results.filter((r) => r.error);
console.log(`Done in ${Date.now() - started}ms — ok: ${ok}, failed: ${failed.length}`);
if (failed.length) {
  console.error("Sample errors:", failed.slice(0, 3).map((r) => r.error?.message));
  process.exit(1);
}

console.log("Load test passed.");
