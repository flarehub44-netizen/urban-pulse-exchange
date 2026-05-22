import { toast } from "sonner";
import { Zap } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { useCasinoEnabled } from "@/hooks/use-casino-enabled";
import { useCasinoQuickDeposit } from "@/hooks/use-casino-spin";
import {
  getLastImpulseAmount,
  IMPULSE_CHIP_AMOUNTS,
  LOW_BALANCE_THRESHOLD,
  setLastImpulseAmount,
} from "@/lib/impulse-deposit";
import { cn } from "@/lib/utils";
import { SimulatedMoneyBanner } from "@/components/viax/simulated-money-banner";

type ImpulseDepositBarProps = {
  balance: number;
  className?: string;
  context?: "low_balance" | "after_loss" | "after_spin";
  suggestedAmount?: number;
};

export function ImpulseDepositBar({
  balance,
  className,
  context = "low_balance",
  suggestedAmount,
}: ImpulseDepositBarProps) {
  const { enabled } = useCasinoEnabled();
  const { mutateAsync: quickDeposit, isPending } = useCasinoQuickDeposit();

  if (!enabled || balance >= LOW_BALANCE_THRESHOLD) return null;

  const amount = suggestedAmount ?? getLastImpulseAmount();

  const onQuick = async (amt: number) => {
    try {
      const res = await quickDeposit({ amount: amt, context });
      setLastImpulseAmount(amt);
      toast.success(copy.casino.depositSuccess(formatBRL(res.balance)));
      if (res.bonus_spin && !("already_spun" in (res.bonus_spin ?? {}))) {
        toast.message(copy.casino.bonusSpinGranted);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : copy.errors.generic);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <SimulatedMoneyBanner />
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/35 bg-warn/10 px-4 py-3 animate-pulse",
        )}
      >
        <div className="flex items-center gap-2 text-sm">
          <Zap className="size-4 text-warn shrink-0" />
          <span>{copy.casino.lowBalanceBanner(formatBRL(balance))}</span>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onQuick(amount)}
          className="shrink-0 rounded-lg bg-warn px-4 py-2 text-sm font-semibold text-warn-foreground disabled:opacity-50"
        >
          {copy.casino.oneTapReload(formatBRL(amount))}
        </button>
      </div>
    </div>
  );
}

export function ImpulseDepositChips({
  onSelect,
  disabled,
}: {
  onSelect: (amount: number) => void;
  disabled?: boolean;
}) {
  const last = getLastImpulseAmount();
  return (
    <div className="flex flex-wrap gap-2">
      {IMPULSE_CHIP_AMOUNTS.map((amt) => (
        <button
          key={amt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(amt)}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-medium mono transition-colors",
            amt === last ? "border-primary bg-primary/15 text-primary" : "hover:bg-muted/60",
          )}
        >
          {formatBRL(amt)}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(last)}
        className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground"
      >
        {copy.casino.maxQuick(last)}
      </button>
    </div>
  );
}
