import { Info } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

export function SimulatedMoneyBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs",
        className,
      )}
      role="note"
    >
      <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{copy.wallet.simulatedTitle}</span>
        {" — "}
        {copy.wallet.simulatedDepositNote}
      </p>
    </div>
  );
}
