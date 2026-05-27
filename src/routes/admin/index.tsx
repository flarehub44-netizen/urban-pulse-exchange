import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useAdminDashboardMetrics,
  useAdminVolumeByHour,
  useAdminLiveFeed,
  useAdminSettlementQueue,
  useAdminPartnerApplications,
} from "@/hooks/use-admin-dashboard";
import { useAdminDepositFunnelMetrics } from "@/hooks/use-admin-deposit-funnel";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InlineError } from "@/components/viax/inline-error";
import { AdminRegionVolumeChart } from "@/components/admin/admin-region-volume";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const { data: metrics, isLoading, isError, refetch } = useAdminDashboardMetrics();
  const { data: volumeHour } = useAdminVolumeByHour();
  const { data: feed } = useAdminLiveFeed();
  const { data: settlementQueue } = useAdminSettlementQueue();
  const { data: partnerApps } = useAdminPartnerApplications();
  const { data: funnel } = useAdminDepositFunnelMetrics(7);

  if (isError) {
    return <InlineError onRetry={() => refetch()} />;
  }

  const lifecycle = metrics?.lifecycle as
    | {
        last_tick_ok?: boolean;
        stale_minutes?: number;
        last_tick_at?: string;
      }
    | undefined;

  const chartData = (volumeHour ?? []).map((r) => ({
    label: new Date(r.hour).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    volume: Number(r.volume),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.nav.overview}</h1>
        <p className="text-xs text-muted-foreground">{copy.admin.subtitle}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link
          to="/admin/markets"
          search={{ tab: "disputes" }}
          className="rounded-xl border bg-card/40 p-3 text-sm hover:bg-surface-2 transition"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Fila operacional
          </p>
          <p className="mt-1 font-semibold">
            {(metrics?.dispute_count ?? 0) + (settlementQueue?.length ?? 0)} itens críticos
          </p>
          <p className="text-xs text-muted-foreground mt-1">Disputas + mercados em liquidação</p>
        </Link>
        <Link
          to="/admin/partners"
          className="rounded-xl border bg-card/40 p-3 text-sm hover:bg-surface-2 transition"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Afiliados</p>
          <p className="mt-1 font-semibold">{partnerApps?.length ?? 0} candidaturas pendentes</p>
          <p className="text-xs text-muted-foreground mt-1">Aprovação de creators e termos</p>
        </Link>
        <Link
          to="/admin/markets"
          search={{ tab: "live" }}
          className="rounded-xl border bg-card/40 p-3 text-sm hover:bg-surface-2 transition"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Mercados ao vivo
          </p>
          <p className="mt-1 font-semibold">{metrics?.active_markets ?? 0} ativos agora</p>
          <p className="text-xs text-muted-foreground mt-1">
            Acesse painel de operação em tempo real
          </p>
        </Link>
      </div>

      <div className="rounded-xl border bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Inbox operacional</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
          <div className="rounded-lg border bg-surface/40 px-3 py-2">
            <div className="text-muted-foreground">Disputas abertas</div>
            <div className="mono mt-1 text-lg font-semibold">{metrics?.dispute_count ?? 0}</div>
          </div>
          <div className="rounded-lg border bg-surface/40 px-3 py-2">
            <div className="text-muted-foreground">Liquidação pendente</div>
            <div className="mono mt-1 text-lg font-semibold">{settlementQueue?.length ?? 0}</div>
          </div>
          <div className="rounded-lg border bg-surface/40 px-3 py-2">
            <div className="text-muted-foreground">Candidaturas afiliado</div>
            <div className="mono mt-1 text-lg font-semibold">{partnerApps?.length ?? 0}</div>
          </div>
        </div>
      </div>

      {funnel && (
        <div className="rounded-xl border bg-card/40 p-4">
          <h2 className="text-sm font-semibold">Funil depósito Pix (7 dias)</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-xs">
            {(
              [
                "auth_modal_open",
                "signup_complete",
                "deposit_sheet_open",
                "deposit_qr_shown",
                "deposit_paid",
              ] as const
            ).map((ev) => (
              <div key={ev} className="rounded-lg border bg-surface/40 px-3 py-2">
                <div className="text-muted-foreground">{ev}</div>
                <div className="mono mt-1 text-lg font-semibold">{funnel.counts?.[ev] ?? 0}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Conversão cadastro → pago:{" "}
            <span className="font-medium text-foreground">{funnel.conversion_pct ?? 0}%</span> (
            {funnel.deposit_paid ?? 0}/{funnel.signup_complete ?? 0})
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label={copy.admin.metrics.volumeToday}
          value={isLoading ? "…" : formatBRL(Number(metrics?.volume_today ?? 0))}
        />
        <AdminStatCard
          label={copy.admin.metrics.revenueToday}
          value={isLoading ? "…" : formatBRL(Number(metrics?.revenue_today ?? 0))}
          tone="up"
        />
        <AdminStatCard
          label={copy.admin.metrics.activeMarkets}
          value={isLoading ? "…" : String(metrics?.active_markets ?? 0)}
        />
        <AdminStatCard
          label={copy.admin.metrics.dau}
          value={isLoading ? "…" : String(metrics?.dau ?? 0)}
        />
        <AdminStatCard
          label={copy.admin.metrics.openPools}
          value={isLoading ? "…" : formatBRL(Number(metrics?.open_pools ?? 0))}
        />
        <AdminStatCard
          label={copy.admin.metrics.disputes}
          value={isLoading ? "…" : String(metrics?.dispute_count ?? 0)}
          tone={(metrics?.dispute_count ?? 0) > 0 ? "warn" : "neutral"}
        />
        <AdminStatCard
          label={copy.admin.metrics.cronStatus}
          value={
            lifecycle?.last_tick_ok && (lifecycle.stale_minutes ?? 99) < 5
              ? copy.settings.adminOpsHealthy
              : copy.settings.adminOpsStale
          }
          tone={lifecycle?.last_tick_ok && (lifecycle.stale_minutes ?? 99) < 5 ? "up" : "warn"}
          sub={
            lifecycle?.last_tick_at
              ? formatDistanceToNow(new Date(lifecycle.last_tick_at), {
                  addSuffix: true,
                  locale: ptBR,
                })
              : undefined
          }
        />
      </div>

      <div className="rounded-xl border bg-card/60 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Heatmap — volume por cidade (hoje)
        </h2>
        <div className="mt-4">
          <AdminRegionVolumeChart />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card/60 p-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Volume por hora (24h)
          </h2>
          <div className="mt-4 h-48">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="volume" fill="oklch(0.7 0.2 250)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">
                {copy.admin.overview.noPredictions24h}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card/60 p-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {copy.admin.metrics.liveFeed}
          </h2>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
            {(feed ?? []).map((e, i) => (
              <li key={`${e.ref_id}-${i}`} className="rounded-lg border bg-surface/40 px-3 py-2">
                <span className="text-[10px] uppercase text-primary">{e.kind}</span>
                <p className="mt-0.5 line-clamp-2">{e.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(e.at), { addSuffix: true, locale: ptBR })}
                </p>
              </li>
            ))}
            {!feed?.length && <li className="text-muted-foreground">Nenhum evento recente.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
