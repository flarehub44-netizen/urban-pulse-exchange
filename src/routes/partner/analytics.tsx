import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePartnerAnalytics } from "@/hooks/use-partner";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";

export const Route = createFileRoute("/partner/analytics")({
  component: PartnerAnalyticsPage,
});

function PartnerAnalyticsPage() {
  const { data: a } = usePartnerAnalytics();
  const chart = (a?.volume_by_city ?? []).map((c) => ({ city: c.city, v: Number(c.volume) }));

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
