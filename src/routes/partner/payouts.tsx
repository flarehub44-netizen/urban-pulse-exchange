import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  usePartnerOverview,
  usePartnerPayouts,
  usePartnerPayoutRequest,
} from "@/hooks/use-partner";
import { PaymentInfoBanner } from "@/components/viax/simulated-money-banner";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/partner/payouts")({
  component: PartnerPayoutsPage,
});

function PartnerPayoutsPage() {
  const { data: o } = usePartnerOverview();
  const { data: history } = usePartnerPayouts();
  const { mutateAsync: payout, isPending } = usePartnerPayoutRequest();
  const [amount, setAmount] = useState("100");

  const onPayout = async () => {
    try {
      const res = await payout(Number(amount));
      toast.success(`Saque simulado · saldo ${formatBRL(res.balance)}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.payouts}</h1>
      <PaymentInfoBanner context="partner" />
      <p className="text-xs text-muted-foreground">{copy.partner.simulatedPayout}</p>
      <div className="rounded-xl border bg-card/60 p-4">
        <div className="text-xs text-muted-foreground">Saldo creator</div>
        <div className="text-3xl font-semibold">{formatBRL(o?.balance ?? 0)}</div>
      </div>
      <div className="flex gap-2 items-end">
        <label className="flex-1">
          <span className="text-xs text-muted-foreground">Valor (Pix simulado)</span>
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
          {copy.partner.payoutRequest}
        </button>
      </div>
      <ul className="space-y-2">
        {(history ?? []).map((p) => (
          <li key={p.id} className="rounded-lg border px-3 py-2 text-sm flex justify-between">
            <span>
              {formatBRL(p.amount)} · {p.method}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(p.at), { locale: ptBR, addSuffix: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
