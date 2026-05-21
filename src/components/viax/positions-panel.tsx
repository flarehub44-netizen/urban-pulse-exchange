import { Link } from "@tanstack/react-router";
import { useBets } from "@/hooks/use-bets";
import { useViaX } from "@/store/viax-store";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { Countdown } from "@/components/viax/countdown";
import { copy } from "@/copy/pt-BR";
import { formatBRL, PRIZE_RATIO } from "@/lib/parimutuel";
import { Activity, ArrowUpRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { isOpenBetStatus, statusLabel, type MarketStatus } from "@/lib/market-status";

export function PositionsPanel({ embedded }: { embedded?: boolean }) {
  const { data: bets, isLoading } = useBets();
  const markets = useViaX((s) => s.markets);

  const open = (bets ?? []).filter((b) => isOpenBetStatus(b.marketStatus));
  const resolved = (bets ?? []).filter((b) => !isOpenBetStatus(b.marketStatus));

  const totalAtStake = open.reduce((s, b) => s + b.stake, 0);

  const estimatedPnL = open.reduce((sum, bet) => {
    const live = markets.find((m) => m.id === bet.marketId);
    const poolYes = live ? live.pool.YES : bet.poolYes;
    const poolNo = live ? live.pool.NO : bet.poolNo;
    const totalPool = poolYes + poolNo;
    const sidePool = bet.side === "YES" ? poolYes : poolNo;
    const share = bet.share ?? (sidePool > 0 ? bet.stake / sidePool : 0);
    const estPayout = share * totalPool * PRIZE_RATIO;
    return sum + estPayout - bet.stake;
  }, 0);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.positions.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.positions.subtitle}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KPI label={copy.positions.openCount} value={<span className="mono">{open.length}</span>} />
        <KPI
          label={copy.positions.totalOpen}
          value={<AnimatedNumber value={totalAtStake} format={formatBRL} />}
        />
        <KPI
          label={copy.positions.estimatedGain}
          value={
            <span className={estimatedPnL >= 0 ? "text-up" : "text-down"}>
              <AnimatedNumber
                value={Math.abs(estimatedPnL)}
                format={(v) => `${estimatedPnL >= 0 ? "+" : "-"}${formatBRL(v)}`}
              />
            </span>
          }
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Abertas
          </h2>
          <span className="text-xs text-muted-foreground">{open.length} posições</span>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border bg-card/60" />
            ))}
          </div>
        )}

        {!isLoading && open.length === 0 && (
          <div className="rounded-2xl border bg-card/60 p-8 text-center backdrop-blur">
            <Activity className="mx-auto mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{copy.positions.emptyOpen}</p>
            <Link
              to="/markets"
              search={{ status: "live" }}
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {copy.positions.explore} <ArrowUpRight className="size-3" />
            </Link>
          </div>
        )}

        <div className="space-y-2">
          {open.map((bet) => {
            const live = markets.find((m) => m.id === bet.marketId);
            const poolYes = live ? live.pool.YES : bet.poolYes;
            const poolNo = live ? live.pool.NO : bet.poolNo;
            const totalPool = poolYes + poolNo;
            const sidePool = bet.side === "YES" ? poolYes : poolNo;
            const share = bet.share ?? (sidePool > 0 ? bet.stake / sidePool : 0);
            const estPayout = share * totalPool * PRIZE_RATIO;
            const estPnL = estPayout - bet.stake;
            const prob = totalPool > 0 ? sidePool / totalPool : 0.5;

            return (
              <Link
                key={bet.id}
                to="/markets/$marketId"
                params={{ marketId: bet.marketId }}
                className="group block rounded-xl border bg-card/60 p-4 backdrop-blur transition hover:bg-surface/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>{bet.marketRegion}</span>
                      <StatusPill status={bet.marketStatus} />
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-sm font-medium">
                      {bet.marketQuestion}
                    </div>
                  </div>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <Stat
                    label="Lado"
                    value={
                      <span className={bet.side === "YES" ? "text-up" : "text-down"}>
                        {bet.side === "YES" ? "SIM" : "NÃO"}
                      </span>
                    }
                  />
                  <Stat label="Apostado" value={formatBRL(bet.stake)} />
                  <Stat
                    label={copy.positions.estWin}
                    value={<span className="text-up">{formatBRL(estPayout)}</span>}
                  />
                  <Stat
                    label={copy.positions.estGain}
                    value={
                      <span className={estPnL >= 0 ? "text-up" : "text-down"}>
                        {estPnL >= 0 ? "+" : ""}
                        {formatBRL(estPnL)}
                      </span>
                    }
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Prob. {bet.side === "YES" ? "SIM" : "NÃO"}:{" "}
                    <span className="mono text-foreground">{(prob * 100).toFixed(1)}%</span>
                  </span>
                  {bet.marketEndsAt > 0 && (
                    <Countdown to={bet.marketEndsAt} className="text-[11px]" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {resolved.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Resolvidas
          </h2>
          <div className="space-y-2">
            {resolved.slice(0, 10).map((bet) => {
              const isWin = bet.payout != null && bet.payout > 0;
              return (
                <div key={bet.id} className="rounded-xl border bg-card/60 p-4 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {bet.marketRegion}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-sm">{bet.marketQuestion}</div>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        isWin ? "bg-up/15 text-up" : "bg-down/15 text-down",
                      )}
                    >
                      {isWin ? "GANHOU" : "PERDEU"}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Apostado: <span className="mono text-foreground">{formatBRL(bet.stake)}</span>
                    </span>
                    <span>
                      Lado:{" "}
                      <span className={cn("mono", bet.side === "YES" ? "text-up" : "text-down")}>
                        {bet.side === "YES" ? "SIM" : "NÃO"}
                      </span>
                    </span>
                    {bet.payout != null && (
                      <span>
                        {copy.positions.payout}{" "}
                        <span className={cn("mono", isWin ? "text-up" : "text-down")}>
                          {formatBRL(bet.payout)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            to="/profile"
            search={{ tab: "carteira" }}
            className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver histórico completo na Carteira <ArrowUpRight className="size-3" />
          </Link>
        </section>
      )}
    </div>
  );
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <TrendingUp className="size-3" /> {label}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-surface/60 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mono mt-0.5 text-sm">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: MarketStatus }) {
  const live = status === "live";
  const closing = status === "closing";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        live ? "text-up" : closing ? "text-warn" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          live ? "bg-up" : closing ? "bg-warn" : "bg-muted-foreground",
        )}
      />
      {statusLabel(status)}
    </span>
  );
}
