import { Wallet } from "lucide-react";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { copy } from "@/copy/pt-BR";

export function DepositPromptBanner() {
  const { openDeposit } = useDepositSheet();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <Wallet className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">{copy.depositFunnel.bannerTitle}</p>
          <p className="text-xs text-muted-foreground">{copy.depositFunnel.bannerBody}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => openDeposit({ amount: 200 })}
        className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {copy.depositFunnel.bannerCta}
      </button>
    </div>
  );
}
