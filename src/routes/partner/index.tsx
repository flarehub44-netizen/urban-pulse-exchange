import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PartnerStatCard } from "@/components/partner/partner-stat-card";
import { PartnerLiveFeed } from "@/components/partner/partner-live-feed";
import { usePartnerOverview, usePartnerRevenueSeries, usePartnerEvents } from "@/hooks/use-partner";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { InlineError } from "@/components/viax/inline-error";
import { Link } from "@tanstack/react-router";

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
      {o.admin_preview && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{copy.partner.adminPreviewTitle}</p>
          <p className="mt-1">{copy.partner.adminPreviewDesc}</p>
        </div>
      )}
      {!o.admin_preview && Number(o.referrals) === 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h2 className="text-sm font-semibold">Checklist de ativação</h2>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>1. Copie seu link de divulgação.</li>
            <li>2. Compartilhe em campanhas e comunidade.</li>
            <li>3. Acompanhe primeiro depósito e primeira aposta dos indicados.</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/partner/campaigns"
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-surface-2"
            >
              Abrir campanhas
            </Link>
            <Link
              to="/partner/invites"
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-surface-2"
            >
              Ver indicados
            </Link>
          </div>
        </div>
      )}
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
