import { useMemo } from "react";
import type { Transaction } from "@/store/viax-store";

/** 84-cell activity grid (12 weeks × 7 days) from transaction timestamps. */
export function useActivityCalendar(transactions: Transaction[] | undefined) {
  return useMemo(() => {
    const cells = Array.from({ length: 84 }, () => 0);
    if (!transactions?.length) return cells.map(() => 0.05);
    const now = Date.now();
    const dayMs = 86_400_000;
    for (const tx of transactions) {
      const daysAgo = Math.floor((now - tx.time) / dayMs);
      if (daysAgo >= 0 && daysAgo < 84) {
        const idx = 83 - daysAgo;
        cells[idx] += 1;
      }
    }
    const max = Math.max(1, ...cells);
    return cells.map((c) => (c === 0 ? 0.05 : 0.15 + (c / max) * 0.85));
  }, [transactions]);
}
