import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copy } from "@/copy/pt-BR";
import { formatBRL, formatPct, PRIZE_RATIO } from "@/lib/parimutuel";
import type { Side } from "@/store/viax-store";
import { cn } from "@/lib/utils";

type BetConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: Side;
  stake: number;
  estimatedPayout: number;
  prizePool: number;
  question: string;
  onConfirm: () => void;
  isPending: boolean;
};

export function BetConfirmDialog({
  open,
  onOpenChange,
  side,
  stake,
  estimatedPayout,
  prizePool,
  question,
  onConfirm,
  isPending,
}: BetConfirmDialogProps) {
  const housePct = (1 - PRIZE_RATIO) * 100;
  const prizePct = PRIZE_RATIO * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle>{copy.bet.confirmTitle}</DialogTitle>
          <DialogDescription className="line-clamp-2 text-left">{question}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border bg-surface/60 p-4 text-sm">
          <Row label={copy.bet.confirmSide}>
            <span
              className={cn(
                "font-semibold mono",
                side === "YES" ? "text-up" : "text-down",
              )}
            >
              {side === "YES" ? "SIM" : "NÃO"}
            </span>
          </Row>
          <Row label={copy.bet.confirmStake}>
            <span className="mono font-semibold">{formatBRL(stake)}</span>
          </Row>
          <Row label={copy.bet.prizeTotal}>
            <span className="mono text-muted-foreground">{formatBRL(prizePool)}</span>
          </Row>
          <Row label={copy.bet.potentialWin}>
            <span className="mono font-semibold text-up">{formatBRL(estimatedPayout)}</span>
          </Row>
          <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {copy.bet.confirmFeeNote(housePct, prizePct)}
          </p>
          <p className="text-xs text-muted-foreground">
            {copy.bet.confirmReturn}:{" "}
            <span className="mono text-foreground">
              {formatPct(stake > 0 ? (estimatedPayout - stake) / stake : 0)}
            </span>
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-50"
          >
            {copy.bet.confirmCancel}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50",
              side === "YES" ? "bg-up hover:bg-up/90" : "bg-down hover:bg-down/90",
            )}
          >
            {isPending ? copy.bet.processing : copy.bet.confirmSubmit(side, formatBRL(stake))}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
