import { useState } from "react";
import { toast } from "sonner";
import type { FootballMarketRow } from "@/hooks/use-football-markets";
import type { FootballOutcome } from "@/lib/football-parimutuel";
import { usePlaceFootballBet } from "@/hooks/use-place-football-bet";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import {
  estimatePayout3,
  poolImbalanceWarning3,
  probability3,
  type FootballPool,
} from "@/lib/football-parimutuel";
import { formatBRL, formatPct } from "@/lib/parimutuel";
import { canPlaceBets, isSettledDisplay } from "@/lib/market-status";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

export function FootballOrderBox({ m }: { m: FootballMarketRow }) {
  const { userId, isRegistered } = useAuth();
  const { data: profile } = useProfile(userId);
  const balance = profile?.balance ?? 0;
  const [outcome, setOutcome] = useState<FootballOutcome>("HOME");
  const [stake, setStake] = useState(100);
  const { mutateAsync: placeBet, isPending } = usePlaceFootballBet();
  const { openDeposit } = useDepositSheet();

  const pool: FootballPool = { HOME: m.pool_home, DRAW: m.pool_draw, AWAY: m.pool_away };
  const closesAt = new Date(m.betting_closes_at).getTime();
  const canBet = canPlaceBets(m.status, m.accept_bets, closesAt);
  const settled = isSettledDisplay(m.status);
  const est = estimatePayout3(pool, outcome, stake);
  const warn = poolImbalanceWarning3(pool);

  const onSubmit = async () => {
    if (!userId || !isRegistered) {
      toast.error(isRegistered ? copy.football.loginRequired : copy.auth.registerRequired);
      return;
    }
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
    <div className="rounded-2xl border bg-card/60 p-4" data-testid="football-order-box">
      <h3 className="text-sm font-semibold">{copy.football.placeBet}</h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(["HOME", "DRAW", "AWAY"] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOutcome(o)}
            className={cn(
              "rounded-lg border px-2 py-2 text-xs transition",
              outcome === o
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border hover:bg-surface/50",
            )}
          >
            <div className="font-medium">{outcomeLabel(o, m)}</div>
            <div className="text-muted-foreground">{formatPct(probability3(pool, o))}</div>
          </button>
        ))}
      </div>

      <label className="mt-4 block text-xs text-muted-foreground">{copy.football.stake}</label>
      <input
        type="number"
        min={10}
        max={100000}
        value={stake}
        onChange={(e) => setStake(Number(e.target.value))}
        data-testid="football-order-stake"
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
      />

      <p className="mt-2 text-xs text-muted-foreground">
        {copy.football.estPayout}: <span className="text-foreground">{formatBRL(est)}</span>
      </p>
      {warn && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{warn}</p>}

      <button
        type="button"
        disabled={isPending || stake < 10}
        onClick={() => void onSubmit()}
        data-testid="football-order-submit"
        className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? copy.football.placing : copy.football.confirmBet}
      </button>
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
