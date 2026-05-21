import { useMemo } from "react";
import type { Transaction } from "@/store/viax-store";

/** Cumulative PnL series from transactions (payout positive, entry negative). */
export function usePnlSeries(transactions: Transaction[] | undefined) {
  return useMemo(() => {
    if (!transactions?.length) return [];
    const sorted = [...transactions].sort((a, b) => a.time - b.time);
    let cum = 0;
    return sorted.map((tx, i) => {
      const delta = tx.type === "entry" ? -tx.amount : tx.amount;
      cum += delta;
      return {
        d: i,
        v: cum,
        label: new Date(tx.time).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      };
    });
  }, [transactions]);
}
