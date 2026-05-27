import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePartnerAnalytics } from "@/hooks/use-partner";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { EmptyState } from "@/components/viax/empty-state";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/partner/analytics")({
  component: PartnerAnalyticsPage,
});

function PartnerAnalyticsPage() {
  const { data: a } = usePartnerAnalytics();
  const chart = (a?.volume_by_city ?? []).map((c) => ({ city: c.city, v: Number(c.volume) }));
  const topCity = chart.length ? [...chart].sort((x, y) => y.v - x.v)[0] : null;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.analytics}</h1>
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-xl border p-4">
          <div className="text-muted-foreground">D1 ativos</div>
          <div className="text-2xl font-semibold">{a?.active_bets_24h ?? 0}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-muted-foreground">D7 novos</div>
          <div className="text-2xl font-semibold">{a?.new_referrals_7d ?? 0}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-muted-foreground">LTV proxy (total)</div>
          <div className="text-2xl font-semibold">{a?.total_referrals ?? 0} traders</div>
        </div>
      </div>
      <div className="rounded-xl border bg-card/60 p-4 text-sm">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Insight rápido</p>
        <p className="mt-1">
          {topCity
            ? `Cidade líder: ${topCity.city} (${formatBRL(topCity.v)} de volume).`
            : "Ainda sem dados suficientes para insight por cidade."}
        </p>
      </div>
      {chart.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sem dados por cidade"
          description="As primeiras conversões vão liberar o comparativo geográfico aqui."
        />
      ) : null}
      <div className="rounded-xl border p-4 h-64">
        <h2 className="text-sm font-medium mb-2">Volume por cidade</h2>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={chart}>
            <XAxis dataKey="city" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Bar dataKey="v" fill="var(--color-primary)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
