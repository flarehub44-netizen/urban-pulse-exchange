import { useState } from "react";
import { toast } from "sonner";
import type { Market } from "@/store/viax-store";
import { useResolveCommunityMarket, useVoidCommunityMarket } from "@/hooks/use-community-markets";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

export function CommunityMarketResolvePanel({
  market,
  isCreator,
}: {
  market: Market;
  isCreator: boolean;
}) {
  const { mutateAsync: resolve, isPending: resolving } = useResolveCommunityMarket();
  const { mutateAsync: voidMarket, isPending: voiding } = useVoidCommunityMarket();
  const [confirmSide, setConfirmSide] = useState<"YES" | "NO" | null>(null);

  if (!isCreator || market.marketKind !== "community") return null;
  if (market.status === "settled" || market.status === "void") return null;

  const ended = market.endsAt <= Date.now();
  const canResolve =
    ended &&
    (market.status === "closed" || market.status === "live" || market.status === "closing");

  const onResolve = async (side: "YES" | "NO") => {
    try {
      await resolve({ marketId: market.id, winningSide: side });
      toast.success(copy.community.resolveSuccess, {
        description: copy.impact.pendingCreditHint,
      });
      setConfirmSide(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.errors.generic);
    }
  };

  const onVoid = async () => {
    if (!window.confirm(copy.community.voidConfirm)) return;
    try {
      await voidMarket({ marketId: market.id });
      toast.success(copy.community.voidSuccess);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.errors.generic);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <h3 className="text-sm font-semibold">{copy.community.creatorPanelTitle}</h3>
      {!ended && <p className="text-xs text-muted-foreground">{copy.community.creatorWaitEnd}</p>}
      {ended && canResolve && (
        <>
          <p className="text-xs text-muted-foreground">{copy.community.creatorResolveHint}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={resolving || voiding}
              onClick={() => setConfirmSide("YES")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                confirmSide === "YES" ? "bg-up text-up-foreground" : "border",
              )}
            >
              {copy.bet.sideYes}
            </button>
            <button
              type="button"
              disabled={resolving || voiding}
              onClick={() => setConfirmSide("NO")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                confirmSide === "NO" ? "bg-down text-down-foreground" : "border",
              )}
            >
              {copy.bet.sideNo}
            </button>
          </div>
          {confirmSide && (
            <button
              type="button"
              disabled={resolving}
              onClick={() => void onResolve(confirmSide)}
              className="w-full rounded-lg bg-primary py-2 text-sm text-primary-foreground"
            >
              {copy.community.confirmResolve(confirmSide)}
            </button>
          )}
        </>
      )}
      {(market.status as string) !== "settled" && (market.status as string) !== "void" && (
        <button
          type="button"
          disabled={voiding || resolving}
          onClick={() => void onVoid()}
          className="text-xs text-muted-foreground underline"
        >
          {copy.community.voidCta}
        </button>
      )}
    </div>
  );
}
