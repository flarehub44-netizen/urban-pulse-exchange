import type { Market, Side } from "@/store/viax-store";
import { iaEdgeLabel } from "@/copy/pt-BR";
import { probability } from "@/lib/parimutuel";

export type MarketEdge = {
  aiSide: Side;
  poolProbYes: number;
  /** Pool implied prob for AI's side (0–1) */
  poolProbAiSide: number;
  /** AI confidence minus pool implied prob for AI side, in percentage points */
  edgePp: number;
  label: string;
};

/** Compare UrbanMind side/confidence vs pool-implied probability. */
export function getMarketEdge(m: Market): MarketEdge {
  const poolProbYes = probability(m.pool, "YES");
  const aiSide = m.aiPrediction.side;
  const poolProbAiSide = aiSide === "YES" ? poolProbYes : 1 - poolProbYes;
  const edgePp = (m.aiPrediction.confidence - poolProbAiSide) * 100;
  const label = iaEdgeLabel(aiSide, edgePp);

  return { aiSide, poolProbYes, poolProbAiSide, edgePp, label };
}
