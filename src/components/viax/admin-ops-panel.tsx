import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Coins } from "lucide-react";
import { useLifecycleHealth, usePlatformLedgerSummary } from "@/hooks/use-admin-ops";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { cn } from "@/lib/utils";
import { InlineErrorState } from "@/components/viax/inline-error-state";

export function AdminOpsPanel() {
  const { data: health, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } = useLifecycleHealth(true);
  const { data: ledger, isLoading: ledgerLoading, isError: ledgerError, refetch: refetchLedger } = usePlatformLedgerSummary(true);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card/40 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Activity className="size-3.5" />
          {copy.settings.adminOpsCron}
        </div>
        {healthLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">…</p>
        ) : healthError ? (
          <InlineErrorState message={copy.errors.loadFailed} onRetry={() => refetchHealth()} className="py-4" />
        ) : health ? (
          <ul className="mt-3 space-y-1 text-xs">
            <li>
              {copy.settings.adminOpsLastTick}:{" "}
              {health.last_tick_at
                ? formatDistanceToNow(new Date(health.last_tick_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })
                : "—"}
            </li>
            <li>
              Status:{" "}
              <span
                className={cn(
                  health.last_tick_ok && (health.stale_minutes ?? 999) < 5
                    ? "text-up"
                    : "text-warn",
                )}
              >
                {health.last_tick_ok && (health.stale_minutes ?? 999) < 5
                  ? copy.settings.adminOpsHealthy
                  : copy.settings.adminOpsStale}
              </span>
            </li>
            <li>
              {copy.settings.adminOpsDisputes}: {health.dispute_count}
            </li>
            {health.last_error && <li className="text-down">{health.last_error}</li>}
          </ul>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card/40 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Coins className="size-3.5" />
          {copy.settings.adminOpsLedger}
        </div>
        {ledgerLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">…</p>
        ) : ledgerError ? (
          <InlineErrorState message={copy.errors.loadFailed} onRetry={() => refetchLedger()} className="py-4" />
        ) : ledger ? (
          <div className="mt-3 space-y-1 text-sm">
            <div className="mono font-semibold">
              {formatBRL(Number(ledger.total_house_revenue))}
            </div>
            <p className="text-xs text-muted-foreground">
              {ledger.entry_count} {copy.settings.adminOpsLedgerEntries}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
