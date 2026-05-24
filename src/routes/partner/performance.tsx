import { createFileRoute } from "@tanstack/react-router";
import { usePartnerOverview, usePartnerAnalytics } from "@/hooks/use-partner";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";

export const Route = createFileRoute("/partner/performance")({
  component: PartnerPerformancePage,
});

function PartnerPerformancePage() {
  const { data: o } = usePartnerOverview();
  const { data: a } = usePartnerAnalytics();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.performance}</h1>
      <p className="text-xs text-muted-foreground">
        Métricas agregadas da sua comunidade (sem expor dados pessoais).
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">{copy.partner.predictions24h}</div>
          <div className="mt-1 text-2xl font-semibold">{a?.active_bets_24h ?? 0}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">Novos · 7 dias</div>
          <div className="mt-1 text-2xl font-semibold">{a?.new_referrals_7d ?? 0}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">Volume total</div>
          <div className="mt-1 text-2xl font-semibold">{formatBRL(o?.volume ?? 0)}</div>
        </div>
      </div>
      <div className="rounded-xl border p-4">
        <h2 className="text-sm font-medium">{copy.partner.missionsTitle}</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· Convide 10 traders esta semana → +5% comissão temporária</li>
          <li>· 50k BRL volume indicado → +8% boost</li>
        </ul>
      </div>
    </div>
  );
}
