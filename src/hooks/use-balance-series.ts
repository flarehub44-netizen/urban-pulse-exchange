import { useMemo } from "react";
import type { Transaction } from "@/store/viax-store";

/** Cumulative balance from transaction history (deposit/withdraw/entry/payout). */
export function useBalanceSeries(transactions: Transaction[] | undefined) {
  return useMemo(() => {
    if (!transactions?.length) return [];
    const sorted = [...transactions].sort((a, b) => a.time - b.time);
    let bal = 0;
    return sorted.map((tx, i) => {
      if (tx.type === "deposit") bal += tx.amount;
      else if (tx.type === "withdraw") bal -= tx.amount;
      else if (tx.type === "entry") bal -= tx.amount;
      else if (tx.type === "payout" || tx.type === "refund") bal += tx.amount;
      return {
        d: i,
        v: bal,
        label: new Date(tx.time).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      };
    });
  }, [transactions]);
}
