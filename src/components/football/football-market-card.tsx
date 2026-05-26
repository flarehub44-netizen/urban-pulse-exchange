import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown, ArrowUp, Clock, Minus, Star, Users, Zap } from "lucide-react";
import type { FootballMarketRow } from "@/hooks/use-football-markets";
import type { FootballOutcome } from "@/lib/football-parimutuel";
import { probability3, prizePool3, type FootballPool } from "@/lib/football-parimutuel";
import { formatBRL, formatCompact, formatPct } from "@/lib/parimutuel";
import { statusLabel, isSettledDisplay, canPlaceBets } from "@/lib/market-status";
import { FootballProbBar } from "@/components/football/football-prob-bar";
import { FootballOrderBox } from "@/components/football/football-order-box";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { Countdown } from "@/components/viax/countdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";
import { copy } from "@/copy/pt-BR";

export function FootballMarketCard({ m, compact }: { m: FootballMarketRow; compact?: boolean }) {
  const pool: FootballPool = { HOME: m.pool_home, DRAW: m.pool_draw, AWAY: m.pool_away };
  const pHome = probability3(pool, "HOME");
  const pDraw = probability3(pool, "DRAW");
  const pAway = probability3(pool, "AWAY");
  const closesAt = new Date(m.betting_closes_at).getTime();
  const kickoff = new Date(m.fixture.kickoff_at);
  const minsLeft = closesAt > 0 ? (closesAt - Date.now()) / 60_000 : Infinity;
  const isUrgent = minsLeft > 0 && minsLeft < 30;
  const canBet = canPlaceBets(m.status, m.accept_bets, closesAt);
  const [quickBet, setQuickBet] = useState<FootballOutcome | null>(null);
  const { ids: watchlist, toggle } = useWatchlist();
  const watched = watchlist.includes(m.id);

  const hasScore =
    m.fixture.goals_home != null && m.fixture.goals_away != null && m.fixture.status_short !== "NS";

  return (
    <>
      <motion.div
        data-testid="football-market-card"
        data-market-id={m.id}
        layout
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className={cn("surface-card-interactive group", isUrgent && canBet && "border-warn/40")}
      >
        {isUrgent && canBet && (
          <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-1.5 bg-warn/10 py-1.5 text-[11px] font-medium text-warn">
            <Zap className="size-3 animate-pulse" />
            {copy.markets.closingSoon(minsLeft)}
          </div>
        )}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100",
            isUrgent ? "via-warn/40" : "via-primary/40",
          )}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              {copy.football.badge}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {copy.football.leagueLabel} {m.fixture.api_league_id}
            </span>
            {(m.status === "dispute" || m.status === "void" || isSettledDisplay(m.status)) && (
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                  m.status === "dispute" && "border border-warn/40 bg-warn/10 text-warn",
                  m.status === "void" && "border border-down/30 bg-down/10 text-down",
                  isSettledDisplay(m.status) && "bg-muted text-muted-foreground",
                )}
              >
                {statusLabel(m.status)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              <Countdown to={closesAt} />
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggle(m.id);
              }}
              className={cn(
                "rounded-full p-1 transition",
                watched ? "text-warn" : "text-muted-foreground/40 hover:text-muted-foreground",
              )}
              aria-label={watched ? "Remover favorito" : "Adicionar favorito"}
            >
              <Star className={cn("size-3.5", watched && "fill-warn")} />
            </button>
          </div>
        </div>

        <Link
          to="/football/$marketId"
          params={{ marketId: m.id }}
          className="mt-3 block"
          data-testid="football-market-card-link"
        >
          <h3
            className={cn(
              "font-medium text-foreground leading-snug flex flex-wrap items-center gap-2",
              compact ? "text-sm" : "text-[15px]",
            )}
          >
            {m.fixture.home_logo_url && (
              <img
                src={m.fixture.home_logo_url}
                alt=""
                className="size-6 object-contain"
                loading="lazy"
              />
            )}
            <span>
              {m.fixture.home_team_name} x {m.fixture.away_team_name}
            </span>
            {m.fixture.away_logo_url && (
              <img
                src={m.fixture.away_logo_url}
                alt=""
                className="size-6 object-contain"
                loading="lazy"
              />
            )}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {format(kickoff, "dd MMM · HH:mm", { locale: ptBR })}
            {hasScore && (
              <span className="ml-2 font-medium text-foreground">
                · {m.fixture.goals_home}–{m.fixture.goals_away}
              </span>
            )}
          </p>
        </Link>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <OutcomePct label={copy.football.home} value={pHome} tone="up" />
          <OutcomePct label={copy.football.draw} value={pDraw} tone="warn" />
          <OutcomePct label={copy.football.away} value={pAway} tone="down" />
        </div>

        <div className="mt-3">
          <FootballProbBar pool={pool} />
          <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] mono text-muted-foreground">
            <span>
              {copy.football.home} <span className="text-up">{formatBRL(m.pool_home)}</span>
            </span>
            <span className="text-center">
              {copy.football.draw} <span className="text-warn">{formatBRL(m.pool_draw)}</span>
            </span>
            <span className="text-right">
              {copy.football.away} <span className="text-down">{formatBRL(m.pool_away)}</span>
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="size-3" /> {formatCompact(m.participants)} {copy.marketCard.traders}
          </span>
          <span>
            {copy.marketCard.prizeTotal}{" "}
            <span className="text-foreground mono">{formatBRL(prizePool3(pool))}</span>
          </span>
        </div>

        {!compact && canBet && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <QuickBetButton
              label={copy.football.home}
              pct={pHome}
              icon={<ArrowUp className="size-3.5" />}
              tone="up"
              onClick={() => setQuickBet("HOME")}
            />
            <QuickBetButton
              label={copy.football.draw}
              pct={pDraw}
              icon={<Minus className="size-3.5" />}
              tone="warn"
              onClick={() => setQuickBet("DRAW")}
            />
            <QuickBetButton
              label={copy.football.away}
              pct={pAway}
              icon={<ArrowDown className="size-3.5" />}
              tone="down"
              onClick={() => setQuickBet("AWAY")}
            />
          </div>
        )}
      </motion.div>

      <Dialog
        open={quickBet !== null}
        onOpenChange={(open) => {
          if (!open) setQuickBet(null);
        }}
      >
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
          <DialogHeader className="px-5 pb-0 pt-5">
            <DialogTitle className="line-clamp-2 text-sm font-medium leading-snug">
              {m.fixture.home_team_name} x {m.fixture.away_team_name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{copy.football.placeBet}</p>
          </DialogHeader>
          <div className="p-4">
            <FootballOrderBox
              m={m}
              initialOutcome={quickBet ?? "HOME"}
              onSuccess={() => setQuickBet(null)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OutcomePct({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "up" | "down" | "warn";
}) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-warn";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("flex items-baseline justify-center gap-0.5", color)}>
        <AnimatedNumber value={value * 100} decimals={1} className="text-xl font-semibold" />
        <span className="text-xs opacity-70">%</span>
      </div>
    </div>
  );
}

function QuickBetButton({
  label,
  pct,
  icon,
  tone,
  onClick,
}: {
  label: string;
  pct: number;
  icon: ReactNode;
  tone: "up" | "down" | "warn";
  onClick: () => void;
}) {
  const styles =
    tone === "up"
      ? "border-up/30 bg-up/10 text-up hover:bg-up/20 hover:shadow-[var(--shadow-glow-up)]"
      : tone === "down"
        ? "border-down/30 bg-down/10 text-down hover:bg-down/20 hover:shadow-[var(--shadow-glow-down)]"
        : "border-warn/30 bg-warn/10 text-warn hover:bg-warn/20";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "inline-flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-center text-xs font-medium transition",
        styles,
      )}
    >
      <span className="inline-flex items-center gap-1">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="opacity-80">{(pct * 100).toFixed(0)}%</span>
    </button>
  );
}
