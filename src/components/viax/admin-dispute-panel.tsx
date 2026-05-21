import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Scale, Snowflake } from "lucide-react";
import { useMarkets } from "@/hooks/use-markets";
import { useAdminResolveMarket } from "@/hooks/use-admin-resolve";
import { useAdminFreezeMarket } from "@/hooks/use-admin-freeze";
import { useOpenMarket } from "@/hooks/use-admin-market";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";
import type { Side } from "@/lib/parimutuel";

export function AdminDisputePanel() {
  const { data: markets } = useMarkets();
  const { mutateAsync: resolve, isPending } = useAdminResolveMarket();
  const { mutateAsync: setFrozen, isPending: freezePending } = useAdminFreezeMarket();
  const { mutateAsync: openMarket, isPending: openPending } = useOpenMarket();

  const disputes = (markets ?? []).filter((m) => m.status === "dispute");
  const drafts = (markets ?? []).filter((m) => m.status === "draft");
  const frozen = (markets ?? []).filter((m) => m.frozen === true);
  const open = (markets ?? []).filter(
    (m) =>
      !m.frozen &&
      (m.status === "live" || m.status === "closing" || m.status === "closed"),
  );

  const onFreeze = async (marketId: string, frozen: boolean) => {
    try {
      await setFrozen({ marketId, frozen, note: "admin_panel" });
      toast.success(frozen ? copy.settings.adminFrozen : copy.settings.adminUnfrozen);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.settings.adminResolveError);
    }
  };

  const onOpen = async (marketId: string) => {
    try {
      await openMarket(marketId);
      toast.success(copy.settings.adminOpened);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.settings.adminResolveError);
    }
  };

  const onResolve = async (marketId: string, side: Side) => {
    try {
      await resolve({ marketId, side, note: "admin_panel" });
      toast.success(copy.settings.adminResolved);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.settings.adminResolveError);
    }
  };

  if (!disputes.length && !open.length && !drafts.length && !frozen.length) {
    return (
      <p className="text-xs text-muted-foreground">{copy.settings.adminNoDisputes}</p>
    );
  }

  return (
    <div className="space-y-6">
      {disputes.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {disputes.length} em disputa
        </p>
      )}
      {drafts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{copy.settings.adminDraftTitle}</p>
          {drafts.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card/40 px-3 py-2"
            >
              <span className="truncate text-xs">{m.region}</span>
              <button
                type="button"
                disabled={openPending}
                onClick={() => onOpen(m.id)}
                className="rounded-md border border-primary/40 px-2 py-1 text-[10px] text-primary hover:bg-primary/10"
              >
                {copy.settings.adminOpenBtn}
              </button>
            </div>
          ))}
        </div>
      )}

      {frozen.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Snowflake className="size-3" /> {copy.settings.adminFrozenList}
          </p>
          {frozen.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-down/30 bg-down/5 px-3 py-2"
            >
              <span className="truncate text-xs">{m.region}</span>
              <button
                type="button"
                disabled={freezePending}
                onClick={() => onFreeze(m.id, false)}
                className="rounded-md border px-2 py-1 text-[10px] hover:bg-surface-2"
              >
                {copy.settings.adminUnfreezeBtn}
              </button>
            </div>
          ))}
        </div>
      )}

      {open.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{copy.settings.adminFreezeTitle}</p>
          {open.slice(0, 5).map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card/40 px-3 py-2"
            >
              <span className="truncate text-xs">{m.region}</span>
              <button
                type="button"
                disabled={freezePending}
                onClick={() => onFreeze(m.id, true)}
                className="rounded-md border border-down/40 px-2 py-1 text-[10px] text-down hover:bg-down/10"
              >
                {copy.settings.adminFreezeBtn}
              </button>
            </div>
          ))}
        </div>
      )}

      {disputes.map((m) => (
        <div key={m.id} className="rounded-xl border border-warn/30 bg-warn/5 p-4">
          <div className="flex items-start gap-2">
            <Scale className="mt-0.5 size-4 shrink-0 text-warn" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{m.question}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.region}</p>
              <Link
                to="/markets/$marketId"
                params={{ marketId: m.id }}
                search={{ tab: "audit" }}
                className="mt-2 inline-block text-xs text-primary hover:underline"
              >
                Ver mercado
              </Link>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["YES", "NO"] as const).map((side) => (
              <button
                key={side}
                type="button"
                disabled={isPending}
                onClick={() => onResolve(m.id, side)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50",
                  side === "YES"
                    ? "border-up/50 bg-up/10 text-up hover:bg-up/20"
                    : "border-down/50 bg-down/10 text-down hover:bg-down/20",
                )}
              >
                Liquidar {side === "YES" ? "SIM" : "NÃO"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
