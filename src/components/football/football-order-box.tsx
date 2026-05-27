import { useState, useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import type { FootballMarketRow } from "@/hooks/use-football-markets";
import type { FootballOutcome } from "@/lib/football-parimutuel";
import { usePlaceFootballBet } from "@/hooks/use-place-football-bet";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import {
  estimatePayout3,
  prizePool3,
  poolImbalanceWarning3,
  probability3,
  poolTotal3,
  type FootballPool,
} from "@/lib/football-parimutuel";
import { formatBRL, formatPct } from "@/lib/parimutuel";
import { canPlaceBets, isSettledDisplay } from "@/lib/market-status";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

export function FootballOrderBox({
  m,
  initialOutcome = "HOME",
  onSuccess,
}: {
  m: FootballMarketRow;
  initialOutcome?: FootballOutcome;
  onSuccess?: () => void;
}) {
  const { userId, isRegistered } = useAuth();
  const redirect = useRouterState({
    select: (s) => `${s.location.pathname}${s.location.searchStr}`,
  });
  const { data: profile } = useProfile(userId);
  const balance = profile?.balance ?? 0;
  const [outcome, setOutcome] = useState<FootballOutcome>(initialOutcome);

  useEffect(() => {
    setOutcome(initialOutcome);
  }, [initialOutcome, m.id]);
  const [stake, setStake] = useState(100);
  const { mutateAsync: placeBet, isPending } = usePlaceFootballBet();
  const { openDeposit } = useDepositSheet();

  const pool: FootballPool = { HOME: m.pool_home, DRAW: m.pool_draw, AWAY: m.pool_away };
  const closesAt = new Date(m.betting_closes_at).getTime();
  const canBet = canPlaceBets(m.status, m.accept_bets, closesAt);
  const settled = isSettledDisplay(m.status);
  const est = estimatePayout3(pool, outcome, stake);
  const totalPrize = prizePool3(pool);
  const totalPool = poolTotal3(pool);
  const share = totalPrize > 0 ? Math.max(0, Math.min(1, stake / (pool[outcome] + stake))) : 0;
  const roi = stake > 0 ? est / stake - 1 : 0;
  const warn = poolImbalanceWarning3(pool);
  const fixedPresets = [50, 100, 250, 500];
  const pctPresets = [0.1, 0.25];
  const maxAffordable = Math.max(10, Math.floor(balance));
  const insufficient = stake > balance;

  const onSubmit = async () => {
    if (stake > balance) {
      toast.error(copy.football.insufficientBalance, {
        action: {
          label: copy.depositFunnel.insufficientCta,
          onClick: () => openDeposit({ amount: Math.max(stake, 200), source: "football_order" }),
        },
      });
      return;
    }
    try {
      await placeBet({ marketId: m.id, outcome, stake });
      toast.success(copy.football.betSuccess);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.football.errorGeneric);
    }
  };

  if (settled) {
    return (
      <div className="rounded-2xl border bg-card/60 p-4 text-sm text-muted-foreground">
        {copy.football.settled}
        {m.winning_outcome && (
          <span className="ml-1 font-medium text-foreground">
            {outcomeLabel(m.winning_outcome)}
          </span>
        )}
      </div>
    );
  }

  if (!canBet) {
    return (
      <div className="rounded-2xl border bg-card/60 p-4 text-sm text-muted-foreground">
        {copy.football.bettingClosed}
      </div>
    );
  }

  return (
    <div className="surface-card-featured" data-testid="football-order-box">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="heading-section">
          Prever neste <span className="text-highlight">mercado</span>
        </h3>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(["HOME", "DRAW", "AWAY"] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOutcome(o)}
            className={cn(
              "rounded-xl border p-3 text-left transition",
              outcome === o
                ? "border-primary/60 bg-primary/15 text-foreground shadow-[var(--shadow-elevated)]"
                : "border-border bg-surface hover:bg-surface-2",
            )}
          >
            <div className="font-medium text-sm">{outcomeLabel(o, m)}</div>
            <div className="text-muted-foreground text-xs">{formatPct(probability3(pool, o))}</div>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          {copy.football.stake}
        </label>
        <div className="mt-1 flex items-center gap-2 rounded-xl border bg-surface px-3 py-2">
          <input
            type="number"
            min={10}
            max={100000}
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            data-testid="football-order-stake"
            className="w-full bg-transparent mono text-lg outline-none"
          />
          <span className="shrink-0 text-muted-foreground text-sm">BRL</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {fixedPresets.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setStake(Math.min(v, balance))}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs mono hover:bg-surface-2"
          >
            {formatBRL(v)}
          </button>
        ))}
        {pctPresets.map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => setStake(Math.max(10, Math.floor(balance * pct)))}
            className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs mono text-primary hover:bg-primary/20"
          >
            {(pct * 100).toFixed(0)}%
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStake(maxAffordable)}
          className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
        >
          Máx
        </button>
      </div>

      <div className="mt-1 text-[11px] text-muted-foreground">
        Saldo: <span className="mono text-foreground">{formatBRL(balance)}</span>
      </div>
      {insufficient && balance > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs">
          <span className="text-warn">Saldo insuficiente.</span>
          <button type="button" onClick={() => setStake(maxAffordable)} className="text-primary hover:underline">
            Usar {formatBRL(maxAffordable)}
          </button>
        </div>
      )}
      {warn && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{warn}</p>}

      <div className="mt-4 space-y-2 rounded-xl border bg-surface/60 p-3 text-sm">
        <Row label={copy.markets.prizeTotal} value={<span className="mono text-foreground">{formatBRL(totalPrize)}</span>} />
        <Row label={copy.bet.yourShare} value={<span className="mono">{formatPct(share, 2)}</span>} />
        <Row label={copy.football.estPayout} value={<span className="mono text-up">{formatBRL(est)}</span>} />
        <Row label={copy.bet.estimatedReturn} value={<span className={cn("mono", roi >= 0 ? "text-up" : "text-down")}>{formatPct(roi, 1)}</span>} />
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Volume no mercado: <span className="mono text-foreground">{formatBRL(totalPool)}</span>
      </p>

      {!isRegistered ? (
        <AuthModalTrigger
          mode="signup"
          depositAfter
          redirect={redirect}
          className={cn(
            "mt-4 w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-95",
            (isPending || stake < 10) && "pointer-events-none opacity-50",
          )}
          data-testid="football-order-submit"
        >
          {copy.football.confirmBet}
        </AuthModalTrigger>
      ) : (
        <button
          type="button"
          disabled={isPending || stake < 10}
          onClick={() => void onSubmit()}
          data-testid="football-order-submit"
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
        >
          {isPending ? copy.football.placing : copy.football.confirmBet}
        </button>
      )}

      <p className="mt-3 text-center text-[10px] text-muted-foreground">{copy.bet.poolNote}</p>
    </div>
  );
}

function outcomeLabel(o: FootballOutcome, m?: FootballMarketRow): string {
  if (m) {
    if (o === "HOME") return m.fixture.home_team_name;
    if (o === "AWAY") return m.fixture.away_team_name;
    return copy.football.draw;
  }
  if (o === "HOME") return copy.football.home;
  if (o === "AWAY") return copy.football.away;
  return copy.football.draw;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
