import { copy } from "@/copy/pt-BR";
import { formatBRL, PRIZE_RATIO, probability } from "@/lib/parimutuel";

export function PoolBreakdown({
  poolYes,
  poolNo,
}: {
  poolYes: number;
  poolNo: number;
}) {
  const total = poolYes + poolNo;
  const fee = total * (1 - PRIZE_RATIO);
  const prize = total * PRIZE_RATIO;
  const pYes = probability({ YES: poolYes, NO: poolNo }, "YES");

  return (
    <div className="rounded-xl border bg-surface/40 p-4 text-xs space-y-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{copy.admin.settlement.poolTotal}</span>
        <span className="mono font-semibold">{formatBRL(total)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{copy.admin.settlement.houseFee}</span>
        <span className="mono text-warn">{formatBRL(fee)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{copy.admin.settlement.prize}</span>
        <span className="mono text-up">{formatBRL(prize)}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="bg-up" style={{ width: `${pYes * 100}%` }} />
        <div className="bg-down flex-1" />
      </div>
      <div className="flex justify-between mono text-[10px]">
        <span className="text-up">SIM {(pYes * 100).toFixed(0)}%</span>
        <span className="text-down">NÃO {((1 - pYes) * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
