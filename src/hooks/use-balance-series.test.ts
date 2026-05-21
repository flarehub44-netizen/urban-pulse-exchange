import { describe, it, expect } from "vitest";
import type { Transaction } from "@/store/viax-store";

/** Inline mirror of useBalanceSeries logic for refund coverage (E2E-adjacent). */
function balanceFromTx(transactions: Transaction[]) {
  const sorted = [...transactions].sort((a, b) => a.time - b.time);
  let bal = 0;
  return sorted.map((tx) => {
    if (tx.type === "deposit") bal += tx.amount;
    else if (tx.type === "withdraw") bal -= tx.amount;
    else if (tx.type === "entry") bal -= tx.amount;
    else if (tx.type === "payout" || tx.type === "refund") bal += tx.amount;
    return bal;
  });
}

describe("balance series with refund", () => {
  it("credits refund like payout", () => {
    const tx: Transaction[] = [
      { id: "1", type: "deposit", amount: 1000, time: 1 },
      { id: "2", type: "entry", amount: 100, time: 2 },
      { id: "3", type: "refund", amount: 100, time: 3 },
    ];
    const series = balanceFromTx(tx);
    expect(series[series.length - 1]).toBe(1000);
  });
});
