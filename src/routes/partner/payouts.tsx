import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Info } from "lucide-react";
import {
  usePartnerOverview,
  usePartnerPayouts,
  usePartnerPayoutRequest,
} from "@/hooks/use-partner";
import { PaymentInfoBanner } from "@/components/viax/simulated-money-banner";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { isPartnerPayoutsReal } from "@/lib/partner-payouts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partner/payouts")({
  component: PartnerPayoutsPage,
});

function payoutStatusLabel(status: string) {
  if (status === "simulated") return copy.partner.payoutStatusSimulated;
  if (status === "pending") return copy.partner.payoutStatusPending;
  if (status === "completed") return copy.partner.payoutStatusCompleted;
  return status;
}

function PartnerPayoutsPage() {
  const payoutsReal = isPartnerPayoutsReal();
  const { data: o } = usePartnerOverview();
  const { data: history } = usePartnerPayouts();
  const { mutateAsync: payout, isPending } = usePartnerPayoutRequest();
  const [amount, setAmount] = useState("100");

  const onPayout = async () => {
    try {
      const res = await payout(Number(amount));
      if (res.simulated) {
        toast.success(copy.partner.payoutSimulatedSuccess(formatBRL(res.balance)));
      } else {
        toast.success(copy.partner.payoutPendingSuccess(formatBRL(res.balance)));
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.payouts}</h1>

      <PaymentInfoBanner context="partner" />

      {!payoutsReal ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <div>
            <p className="font-medium text-foreground">{copy.partner.payoutSimulatedTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{copy.partner.simulatedPayout}</p>
            <p className="mt-2 text-xs text-muted-foreground">{copy.partner.payoutSimulatedNote}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">{copy.partner.payoutRealTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{copy.partner.payoutRealNote}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card/60 p-4">
        <div className="text-xs text-muted-foreground">Saldo creator</div>
        <div className="text-3xl font-semibold">{formatBRL(o?.balance ?? 0)}</div>
      </div>

      <div className="flex gap-2 items-end">
        <label className="flex-1">
          <span className="text-xs text-muted-foreground">
            {payoutsReal ? copy.partner.payoutAmountReal : copy.partner.payoutAmountSimulated}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 mono"
          />
        </label>
        <button
          type="button"
          disabled={isPending}
          onClick={onPayout}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {payoutsReal ? copy.partner.payoutRequest : copy.partner.payoutSimulateCta}
        </button>
      </div>

      <ul className="space-y-2">
        {(history ?? []).map((p) => (
          <li key={p.id} className="rounded-lg border px-3 py-2 text-sm flex justify-between gap-3">
            <span>
              {formatBRL(p.amount)} · {p.method}
              <span
                className={cn(
                  "ml-2 rounded-md px-1.5 py-0.5 text-[10px] uppercase",
                  p.status === "simulated"
                    ? "bg-warn/15 text-warn"
                    : p.status === "pending"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {payoutStatusLabel(p.status ?? "completed")}
              </span>
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(p.at), { locale: ptBR, addSuffix: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
