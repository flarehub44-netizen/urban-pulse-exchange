import type { Market } from "@/store/viax-store";

/** Visual pool drift for demo/empty DB — not used when Supabase markets are loaded. */
export function animateMarkets(markets: Market[]): Market[] {
  return markets.map((m) => {
    if (m.status === "settled" || m.status === "resolved" || m.status === "void") return m;
    const driftY = (Math.random() - 0.49) * 600 + m.trend * 80;
    const driftN = (Math.random() - 0.49) * 600 - m.trend * 80;
    const YES = Math.max(2000, m.pool.YES + driftY);
    const NO = Math.max(2000, m.pool.NO + driftN);
    const total = YES + NO;
    const p = YES / total;
    const history = [...m.history.slice(-49), { t: Date.now(), p }];
    const newTrend = Math.max(-1, Math.min(1, m.trend + (Math.random() - 0.5) * 0.2));
    const participants =
      m.participants + (Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 3) : 0);
    return { ...m, pool: { YES, NO }, history, trend: newTrend, participants };
  });
}
