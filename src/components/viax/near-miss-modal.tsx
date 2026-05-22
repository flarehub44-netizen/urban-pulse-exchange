import { Link } from "@tanstack/react-router";
import { X, Zap } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { nearMissGapPercent, type NearMissMeta } from "@/lib/near-miss";
import type { Market } from "@/store/viax-store";
import { cn } from "@/lib/utils";

export type NearMissPayload = {
  marketId?: string;
  question?: string;
  meta?: NearMissMeta;
  suggestedDeposit?: number;
};

type NearMissModalProps = {
  open: boolean;
  onClose: () => void;
  payload: NearMissPayload | null;
  market?: Pick<Market, "pool"> | null;
  onQuickDeposit?: (amount: number) => void;
  depositPending?: boolean;
};

export function NearMissModal({
  open,
  onClose,
  payload,
  market,
  onQuickDeposit,
  depositPending,
}: NearMissModalProps) {
  if (!open || !payload) return null;

  const gap = market ? nearMissGapPercent(market) : 8;
  const stake = payload.meta?.stake ?? 0;
  const depositAmt = payload.suggestedDeposit ?? (Math.ceil(stake * 1.2) || 100);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="near-miss-title"
        className="w-full max-w-md rounded-2xl border border-warn/30 bg-card p-5 shadow-xl animate-in fade-in slide-in-from-bottom-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-warn">
            <Zap className="size-5" />
            <h2 id="near-miss-title" className="text-lg font-semibold">
              {copy.casino.nearMissTitle}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {copy.casino.nearMissBody(gap)}
        </p>
        {payload.question && (
          <p className="mt-2 text-xs font-medium line-clamp-2">{payload.question}</p>
        )}
        {stake > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.casino.nearMissStake(formatBRL(stake))}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/markets"
            search={{ status: "live" }}
            onClick={onClose}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
          >
            {copy.casino.tryAnotherMarket}
          </Link>
          {onQuickDeposit && (
            <button
              type="button"
              disabled={depositPending}
              onClick={() => onQuickDeposit(depositAmt)}
              className={cn(
                "flex-1 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm font-medium",
                depositPending && "opacity-50",
              )}
            >
              {copy.casino.reloadAndContinue(formatBRL(depositAmt))}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
