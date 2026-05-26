import { Link } from "@tanstack/react-router";
import { useBets } from "@/hooks/use-bets";
import { useCatalogMarkets } from "@/hooks/use-markets";
import { copy } from "@/copy/pt-BR";
import { formatBRL, PRIZE_RATIO } from "@/lib/parimutuel";
import { Countdown } from "@/components/viax/countdown";
import { cn } from "@/lib/utils";
import { isOpenBetStatus } from "@/lib/market-status";
import { Briefcase } from "lucide-react";

export function OpenPositionStrip({ marketId }: { marketId: string }) {
  const { data: bets } = useBets();
  const markets = useCatalogMarkets();
  const bet = (bets ?? []).find((b) => b.marketId === marketId && isOpenBetStatus(b.marketStatus));
  if (!bet) return null;

  const live = markets.find((m) => m.id === bet.marketId);
  const poolYes = live ? live.pool.YES : bet.poolYes;
  const poolNo = live ? live.pool.NO : bet.poolNo;
  const totalPool = poolYes + poolNo;
  const sidePool = bet.side === "YES" ? poolYes : poolNo;
  const share = bet.share ?? (sidePool > 0 ? bet.stake / sidePool : 0);
  const estPayout = share * totalPool * PRIZE_RATIO;
  const estPnL = estPayout - bet.stake;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
          <Briefcase className="size-3.5" /> Sua posição neste mercado
        </span>
        <Link
          to="/profile"
          search={{ tab: "posicoes" }}
          className="text-[11px] text-primary hover:underline"
        >
          Ver todas
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className={cn("font-medium", bet.side === "YES" ? "text-up" : "text-down")}>
          {bet.side === "YES" ? "↑ SIM" : "↓ NÃO"}
        </span>
        <span className="text-muted-foreground">
          {copy.positions.stakeLabel}{" "}
          <span className="mono text-foreground">{formatBRL(bet.stake)}</span>
        </span>
        <span className={cn("mono font-medium", estPnL >= 0 ? "text-up" : "text-down")}>
          {copy.positions.estGain} {estPnL >= 0 ? "+" : ""}
          {formatBRL(estPnL)}
        </span>
        {bet.marketEndsAt > 0 && (
          <span className="text-xs text-muted-foreground">
            Encerra <Countdown to={bet.marketEndsAt} />
          </span>
        )}
      </div>
    </div>
  );
}
