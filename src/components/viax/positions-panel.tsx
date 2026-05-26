import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useBets } from "@/hooks/use-bets";
import { useFootballBets, type FootballOpenBet } from "@/hooks/use-football-bets";
import { useCatalogMarkets } from "@/hooks/use-markets";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { Countdown } from "@/components/viax/countdown";
import { copy } from "@/copy/pt-BR";
import { estimatePayout3, type FootballOutcome } from "@/lib/football-parimutuel";
import { formatBRL, PRIZE_RATIO } from "@/lib/parimutuel";
import {
  Activity,
  TrendingUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ArrowUpRight,
} from "lucide-react";
import { EmptyState } from "@/components/viax/empty-state";
import { cn } from "@/lib/utils";
import { isOpenBetStatus, statusLabel, type MarketStatus } from "@/lib/market-status";

export function PositionsPanel({ embedded }: { embedded?: boolean }) {
  const { data: bets, isLoading } = useBets();
  const { data: fbBets, isLoading: fbLoading } = useFootballBets();
  const markets = useCatalogMarkets();

  const open = (bets ?? []).filter((b) => isOpenBetStatus(b.marketStatus));
  const resolved = (bets ?? []).filter((b) => !isOpenBetStatus(b.marketStatus));
  const fbOpen = (fbBets ?? []).filter((b) => isOpenBetStatus(b.marketStatus));
  const fbResolved = (fbBets ?? []).filter((b) => !isOpenBetStatus(b.marketStatus));

  const totalAtStake =
    open.reduce((s, b) => s + b.stake, 0) + fbOpen.reduce((s, b) => s + b.stake, 0);

  const estimatedPnL =
    open.reduce((sum, bet) => {
      const live = markets.find((m) => m.id === bet.marketId);
      const poolYes = live ? live.pool.YES : bet.poolYes;
      const poolNo = live ? live.pool.NO : bet.poolNo;
      const totalPool = poolYes + poolNo;
      const sidePool = bet.side === "YES" ? poolYes : poolNo;
      const share = bet.share ?? (sidePool > 0 ? bet.stake / sidePool : 0);
      const estPayout = share * totalPool * PRIZE_RATIO;
      return sum + estPayout - bet.stake;
    }, 0) +
    fbOpen.reduce((sum, bet) => {
      const pool = { HOME: bet.poolHome, DRAW: bet.poolDraw, AWAY: bet.poolAway };
      const estPayout = estimatePayout3(pool, bet.outcome, bet.stake);
      return sum + estPayout - bet.stake;
    }, 0);

  const loading = isLoading || fbLoading;
  const openCount = open.length + fbOpen.length;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="heading-page text-2xl">
            Minhas <span className="text-highlight">previsões</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.positions.subtitle}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KPI label={copy.positions.openCount} value={<span className="mono">{openCount}</span>} />
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
          <h2 className="heading-subsection">
            <span className="text-highlight">Abertas</span>
          </h2>
          <span className="text-xs text-muted-foreground">{openCount} posições</span>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border bg-card/60" />
            ))}
          </div>
        )}

        {!loading && openCount === 0 && (
          <EmptyState
            icon={Activity}
            title={copy.empty.positions.title}
            description={copy.empty.positions.description}
            action={{
              label: copy.empty.positions.cta,
              to: "/markets",
              search: { status: "live" },
            }}
          />
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
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
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
                  <Stat label={copy.positions.stakeLabel} value={formatBRL(bet.stake)} />
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
          {fbOpen.map((bet) => (
            <FootballOpenBetRow key={bet.id} bet={bet} />
          ))}
        </div>
      </section>

      {(resolved.length > 0 || fbResolved.length > 0) && (
        <section>
          <h2 className="heading-subsection mb-3">
            <span className="text-highlight">Resolvidas</span>
          </h2>
          <div className="space-y-2">
            {resolved.slice(0, 10).map((bet) => (
              <ResolvedBetRow key={bet.id} bet={bet} />
            ))}
            {fbResolved.slice(0, 10).map((bet) => (
              <FootballResolvedBetRow key={bet.id} bet={bet} />
            ))}
          </div>
          <Link
            to="/wallet"
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
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
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

function ResolvedBetRow({ bet }: { bet: import("@/hooks/use-bets").OpenBet }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const isWin = bet.payout != null && bet.payout > 0;

  return (
    <div className="rounded-xl border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
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
          {copy.positions.stakeLabel}:{" "}
          <span className="mono text-foreground">{formatBRL(bet.stake)}</span>
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

      {/* Prediction Journal note */}
      {bet.note && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface/60 px-2.5 py-2 text-xs text-muted-foreground">
          <BookOpen className="size-3 mt-0.5 shrink-0 text-primary/60" />
          <span className="italic">"{bet.note}"</span>
        </div>
      )}

      {/* A6: Error analysis (only for lost bets) */}
      {!isWin && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowAnalysis((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="size-3" />O que aconteceu?
            {showAnalysis ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
          {showAnalysis && (
            <div className="mt-2 rounded-lg border border-down/20 bg-down/5 p-3 text-xs space-y-1.5 text-muted-foreground">
              <p className="font-medium text-foreground">{copy.positions.lostAnalysisTitle}</p>
              <p>
                {copy.positions.lostAnalysisLine}{" "}
                <span className={cn("font-medium", bet.side === "YES" ? "text-up" : "text-down")}>
                  {bet.side === "YES" ? "SIM" : "NÃO"}
                </span>{" "}
                com <span className="mono text-foreground">{formatBRL(bet.stake)}</span>.
              </p>
              {bet.note && (
                <p>
                  Seu raciocínio: <span className="italic text-foreground">"{bet.note}"</span>
                </p>
              )}
              <p className="pt-1 border-t border-border/40">
                <span className="font-medium text-down">Resultado:</span> O mercado resolveu no lado
                oposto ao seu. Avalie se havia informação adicional disponível que poderia ter
                mudado sua análise.
              </p>
              <Link
                to="/markets/$marketId"
                params={{ marketId: bet.marketId }}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Ver mercado <ArrowUpRight className="size-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function footballOutcomeLabel(o: FootballOutcome, bet: FootballOpenBet): string {
  if (o === "HOME") return bet.homeTeam;
  if (o === "AWAY") return bet.awayTeam;
  return copy.football.draw;
}

function FootballOpenBetRow({ bet }: { bet: FootballOpenBet }) {
  const pool = { HOME: bet.poolHome, DRAW: bet.poolDraw, AWAY: bet.poolAway };
  const estPayout = estimatePayout3(pool, bet.outcome, bet.stake);
  const estPnL = estPayout - bet.stake;

  return (
    <Link
      to="/football/$marketId"
      params={{ marketId: bet.marketId }}
      className="group block rounded-xl border bg-card/60 p-4 backdrop-blur transition hover:bg-surface/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <span>{copy.positions.footballBadge}</span>
            <StatusPill status={bet.marketStatus} />
          </div>
          <div className="mt-0.5 line-clamp-2 text-sm font-medium">
            {bet.homeTeam} x {bet.awayTeam}
          </div>
        </div>
        <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <Stat
          label="Lado"
          value={<span className="text-primary">{footballOutcomeLabel(bet.outcome, bet)}</span>}
        />
        <Stat label={copy.positions.stakeLabel} value={formatBRL(bet.stake)} />
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
    </Link>
  );
}

function FootballResolvedBetRow({ bet }: { bet: FootballOpenBet }) {
  const isWin = bet.payout != null && bet.payout > 0;
  return (
    <div className="rounded-xl border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {copy.positions.footballBadge}
          </div>
          <div className="mt-0.5 line-clamp-1 text-sm">
            {bet.homeTeam} x {bet.awayTeam}
          </div>
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
          {copy.positions.stakeLabel}:{" "}
          <span className="mono text-foreground">{formatBRL(bet.stake)}</span>
        </span>
        <span>
          Lado:{" "}
          <span className="mono text-foreground">{footballOutcomeLabel(bet.outcome, bet)}</span>
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
