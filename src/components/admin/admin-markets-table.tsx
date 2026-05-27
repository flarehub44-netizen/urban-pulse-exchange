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
import { DesktopTableWrap, MobileDataList, MobileFieldRow } from "@/components/ui/responsive-table";

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

  const renderActions = (m: Market) => (
    <div className="flex flex-wrap gap-2">
      <Link
        to="/markets/$marketId"
        params={{ marketId: m.id }}
        className="min-h-[44px] rounded border px-3 py-2 text-xs hover:bg-surface-2 md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]"
      >
        Ver
      </Link>
      {m.status === "draft" && (
        <button
          type="button"
          onClick={() => onOpen(m.id)}
          className="min-h-[44px] rounded border border-primary/40 px-3 py-2 text-xs text-primary md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]"
        >
          {copy.settings.adminOpenBtn}
        </button>
      )}
      {(m.status === "live" || m.status === "closing") && !m.frozen && (
        <>
          <button
            type="button"
            onClick={() => onExtend(m.id, 2)}
            className="min-h-[44px] rounded border px-3 py-2 text-xs hover:bg-surface-2 md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]"
          >
            +2h
          </button>
          <button
            type="button"
            onClick={() => onPause(m.id, m.acceptBets !== false)}
            className="min-h-[44px] rounded border px-3 py-2 text-xs hover:bg-surface-2 md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]"
          >
            {m.acceptBets === false ? "Retomar" : "Pausar"}
          </button>
          <button
            type="button"
            onClick={() => onFreeze(m, true)}
            className="min-h-[44px] rounded border border-down/40 px-3 py-2 text-xs text-down md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]"
          >
            {copy.settings.adminFreezeBtn}
          </button>
          <button
            type="button"
            onClick={() => onForceClose(m.id)}
            className="min-h-[44px] rounded border border-warn/40 px-3 py-2 text-xs text-warn md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]"
          >
            {copy.admin.markets.forceClose}
          </button>
        </>
      )}
      {m.frozen && (
        <button
          type="button"
          onClick={() => onFreeze(m, false)}
          className="min-h-[44px] rounded border px-3 py-2 text-xs md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]"
        >
          {copy.settings.adminUnfreezeBtn}
        </button>
      )}
    </div>
  );

  return (
    <>
      <MobileDataList
        items={markets}
        keyFn={(m) => m.id}
        emptyText="Nenhum mercado."
        renderCard={(m) => {
          const vol = prizePool(m.pool);
          const pYes = probability(m.pool, "YES");
          return (
            <div className="space-y-3">
              <MobileFieldRow label="Mercado">
                <p className="font-medium">{m.question}</p>
              </MobileFieldRow>
              <MobileFieldRow label="Região">
                <span className="text-muted-foreground">{m.region}</span>
              </MobileFieldRow>
              <MobileFieldRow label={copy.admin.markets.tableStatus}>
                <StatusPill status={m.status} frozen={m.frozen} />
              </MobileFieldRow>
              <MobileFieldRow label={copy.admin.markets.tableVolume}>
                <span className="mono">{formatBRL(vol)}</span>
              </MobileFieldRow>
              <MobileFieldRow label="SIM %">
                <span className="mono text-up">{(pYes * 100).toFixed(0)}%</span>
              </MobileFieldRow>
              <MobileFieldRow label="Ações">{renderActions(m)}</MobileFieldRow>
            </div>
          );
        }}
      />
      <DesktopTableWrap>
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
                <td className="px-3 py-2">{renderActions(m)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
      </DesktopTableWrap>
    </>
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
