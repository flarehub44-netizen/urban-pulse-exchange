import { createFileRoute } from "@tanstack/react-router";
import { useAdminFinance, useAdminOpenExposure } from "@/hooks/use-admin-dashboard";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { InlineError } from "@/components/viax/inline-error";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/admin/finance")({
  component: AdminFinancePage,
});

function AdminFinancePage() {
  const { data, isLoading, isError, refetch } = useAdminFinance();
  const { data: exposure } = useAdminOpenExposure();

  if (isError) return <InlineError onRetry={() => refetch()} />;

  const summary = data?.summary;
  const byRegion = data?.by_region ?? [];
  const byKind = data?.by_kind ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.nav.finance}</h1>
        <p className="text-xs text-muted-foreground">Pools · receita · payout</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Receita total (casa)"
          value={isLoading ? "…" : formatBRL(Number(summary?.total_house_revenue ?? 0))}
          tone="up"
        />
        <AdminStatCard
          label="Lançamentos ledger"
          value={isLoading ? "…" : String(summary?.entry_count ?? 0)}
        />
        <AdminStatCard
          label="Pools abertos"
          value={formatBRL(Number(exposure?.open_pool_total ?? 0))}
        />
        <AdminStatCard
          label="Apostas em jogo"
          value={formatBRL(Number(exposure?.open_bets_total ?? 0))}
          sub={`${exposure?.markets_with_bets ?? 0} mercados`}
        />
      </div>

      <div className="rounded-xl border bg-card/60 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Volume hoje por cidade
        </h2>
        <div className="mt-4 h-56">
          {byRegion.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRegion.map((r) => ({ name: r.region, volume: Number(r.volume) }))}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="volume" fill="oklch(0.76 0.18 152)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground">Sem volume hoje.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="border-b bg-surface/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Tipo ledger</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {byKind.map((k) => (
              <tr key={k.kind} className="border-b border-border/40">
                <td className="px-3 py-2">{k.kind}</td>
                <td className="px-3 py-2 text-right mono">{formatBRL(Number(k.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
