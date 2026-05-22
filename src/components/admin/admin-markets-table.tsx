import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMarketsList } from "@/hooks/use-markets";
import {
  useAdminForceClose,
  useAdminExtendMarket,
  useAdminPauseBets,
} from "@/hooks/use-admin-dashboard";
import { useAdminFreezeMarket } from "@/hooks/use-admin-freeze";
import { useOpenMarket } from "@/hooks/use-admin-market";
import { formatBRL, probability, prizePool } from "@/lib/parimutuel";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";
import type { Market } from "@/store/viax-store";

export function AdminMarketsTable() {
  const { markets, isLoading } = useMarketsList();
  const { mutateAsync: forceClose } = useAdminForceClose();
  const { mutateAsync: setFrozen } = useAdminFreezeMarket();
  const { mutateAsync: openMarket } = useOpenMarket();
  const { mutateAsync: extendMarket } = useAdminExtendMarket();
  const { mutateAsync: pauseBets } = useAdminPauseBets();

  const onForceClose = async (id: string) => {
    try {
      await forceClose({ marketId: id });
      toast.success("Mercado fechado.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onFreeze = async (m: Market, frozen: boolean) => {
    try {
      await setFrozen({ marketId: m.id, frozen, note: "admin_table" });
      toast.success(frozen ? copy.settings.adminFrozen : copy.settings.adminUnfrozen);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onExtend = async (id: string, hours: number) => {
    try {
      await extendMarket({ marketId: id, hours });
      toast.success(`Prazo estendido +${hours}h`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onPause = async (id: string, paused: boolean) => {
    try {
      await pauseBets({ marketId: id, paused });
      toast.success(paused ? "Entradas pausadas" : "Entradas reabertas");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onOpen = async (id: string) => {
    try {
      await openMarket(id);
      toast.success(copy.settings.adminOpened);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Carregando mercados…</p>;

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="border-b bg-surface/60 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Mercado</th>
            <th className="px-3 py-2">Região</th>
            <th className="px-3 py-2">{copy.admin.markets.tableStatus}</th>
            <th className="px-3 py-2">{copy.admin.markets.tableVolume}</th>
            <th className="px-3 py-2">SIM %</th>
            <th className="px-3 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => {
            const vol = prizePool(m.pool);
            const pYes = probability(m.pool, "YES");
            return (
              <tr key={m.id} className="border-b border-border/40 hover:bg-surface/30">
                <td className="max-w-[200px] truncate px-3 py-2 font-medium">{m.question}</td>
                <td className="px-3 py-2 text-muted-foreground">{m.region}</td>
                <td className="px-3 py-2">
                  <StatusPill status={m.status} frozen={m.frozen} />
                </td>
                <td className="px-3 py-2 mono">{formatBRL(vol)}</td>
                <td className="px-3 py-2 mono text-up">{(pYes * 100).toFixed(0)}%</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Link
                      to="/markets/$marketId"
                      params={{ marketId: m.id }}
                      className="rounded border px-2 py-0.5 text-[10px] hover:bg-surface-2"
                    >
                      Ver
                    </Link>
                    {m.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => onOpen(m.id)}
                        className="rounded border border-primary/40 px-2 py-0.5 text-[10px] text-primary"
                      >
                        {copy.settings.adminOpenBtn}
                      </button>
                    )}
                    {(m.status === "live" || m.status === "closing") && !m.frozen && (
                      <>
                        <button
                          type="button"
                          onClick={() => onExtend(m.id, 2)}
                          className="rounded border px-2 py-0.5 text-[10px] hover:bg-surface-2"
                        >
                          +2h
                        </button>
                        <button
                          type="button"
                          onClick={() => onPause(m.id, m.acceptBets !== false)}
                          className="rounded border px-2 py-0.5 text-[10px] hover:bg-surface-2"
                        >
                          {m.acceptBets === false ? "Retomar" : "Pausar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onFreeze(m, true)}
                          className="rounded border border-down/40 px-2 py-0.5 text-[10px] text-down"
                        >
                          {copy.settings.adminFreezeBtn}
                        </button>
                        <button
                          type="button"
                          onClick={() => onForceClose(m.id)}
                          className="rounded border border-warn/40 px-2 py-0.5 text-[10px] text-warn"
                        >
                          {copy.admin.markets.forceClose}
                        </button>
                      </>
                    )}
                    {m.frozen && (
                      <button
                        type="button"
                        onClick={() => onFreeze(m, false)}
                        className="rounded border px-2 py-0.5 text-[10px]"
                      >
                        {copy.settings.adminUnfreezeBtn}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status, frozen }: { status: string; frozen?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
        frozen && "bg-down/15 text-down",
        !frozen && status === "live" && "bg-up/15 text-up",
        !frozen && status === "dispute" && "bg-warn/15 text-warn",
        !frozen && status === "draft" && "bg-muted text-muted-foreground",
      )}
    >
      {frozen ? "congelado" : status}
    </span>
  );
}
