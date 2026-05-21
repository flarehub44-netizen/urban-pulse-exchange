import type { Market } from "@/store/viax-store";
import type { OpenBet } from "@/hooks/use-bets";
import { getMarketEdge } from "@/lib/market-edge";
import { PRIZE_RATIO } from "@/lib/parimutuel";

export type ActionNowItem =
  | { type: "position"; priority: number; bet: OpenBet; estPnL: number; minutesLeft: number }
  | { type: "closing"; priority: number; market: Market }
  | { type: "urbanmind"; priority: number; market: Market };

const MS_15MIN = 15 * 60 * 1000;

export function buildActionNowItems(
  openBets: OpenBet[],
  markets: Market[],
  urbanMindMarket: Market | undefined,
): ActionNowItem[] {
  const now = Date.now();
  const items: ActionNowItem[] = [];

  for (const bet of openBets) {
    const live = markets.find((m) => m.id === bet.marketId);
    const poolYes = live ? live.pool.YES : bet.poolYes;
    const poolNo = live ? live.pool.NO : bet.poolNo;
    const totalPool = poolYes + poolNo;
    const sidePool = bet.side === "YES" ? poolYes : poolNo;
    const share = bet.share ?? (sidePool > 0 ? bet.stake / sidePool : 0);
    const estPnL = share * totalPool * PRIZE_RATIO - bet.stake;
    const minutesLeft = bet.marketEndsAt > 0 ? (bet.marketEndsAt - now) / 60_000 : 999;
    const urgency = minutesLeft < 15 ? 1000 : 0;
    items.push({
      type: "position",
      priority: urgency + Math.abs(estPnL) + bet.stake,
      bet,
      estPnL,
      minutesLeft,
    });
  }

  for (const m of markets) {
    if (m.status !== "closing") continue;
    const msLeft = m.endsAt - now;
    if (msLeft > MS_15MIN || msLeft < 0) continue;
    const edge = Math.abs(getMarketEdge(m).edgePp);
    items.push({ type: "closing", priority: 800 + edge + (MS_15MIN - msLeft) / 1000, market: m });
  }

  if (urbanMindMarket && urbanMindMarket.status !== "resolved") {
    items.push({ type: "urbanmind", priority: 100, market: urbanMindMarket });
  }

  return items.sort((a, b) => b.priority - a.priority);
}
