import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PartnerStatCard } from "@/components/partner/partner-stat-card";
import { PartnerLiveFeed } from "@/components/partner/partner-live-feed";
import { usePartnerOverview, usePartnerRevenueSeries, usePartnerEvents } from "@/hooks/use-partner";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { InlineError } from "@/components/viax/inline-error";

export const Route = createFileRoute("/partner/")({
  component: PartnerOverviewPage,
});

function PartnerOverviewPage() {
  const { data: o, isError, refetch } = usePartnerOverview();
  const { data: series } = usePartnerRevenueSeries(30);
  const { data: events } = usePartnerEvents();

  if (isError) return <InlineError onRetry={() => refetch()} />;
  if (!o) return null;

  const chart = (series ?? []).map((p) => ({
    d: new Date(p.day).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    v: Number(p.amount),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.partner.nav.overview}</h1>
        <p className="text-xs text-muted-foreground">
          {o.tier} · @{o.slug} · {(o.revenue_share_pct * 100).toFixed(0)}%{" "}
          {copy.partner.stats.commissionHint}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          CPA {formatBRL(Number(o.cpa_amount))}
          {o.cpa_uses_custom ? "" : " (padrão)"} · {copy.partner.stats.cpaHint}{" "}
          {formatBRL(Number(o.cpa_min_deposit_threshold))}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PartnerStatCard label={copy.partner.stats.revenue} value={o.revenue} format={formatBRL} />
        <PartnerStatCard label={copy.partner.stats.referrals} value={o.referrals} />
        <PartnerStatCard label={copy.partner.stats.volume} value={o.volume} format={formatBRL} />
        <PartnerStatCard
          label={copy.partner.stats.conversion}
          value={o.conversion_rate}
          format={(n) => `${n}%`}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card/60 p-4">
          <h2 className="text-sm font-medium">Receita · 30 dias</h2>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart.length ? chart : [{ d: "—", v: 0 }]}>
                <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary)"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-card/60 p-4">
          <h2 className="text-sm font-medium">{copy.partner.liveFeed}</h2>
          <div className="mt-3">
            <PartnerLiveFeed events={events ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
