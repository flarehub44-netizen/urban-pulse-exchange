import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FootballMarketRow } from "@/hooks/use-football-markets";
import { probability3, poolTotal3 } from "@/lib/football-parimutuel";
import { formatPct } from "@/lib/parimutuel";
import { statusLabel, isSettledDisplay } from "@/lib/market-status";
import { cn } from "@/lib/utils";
import { copy } from "@/copy/pt-BR";

export function FootballMarketCard({ m }: { m: FootballMarketRow }) {
  const pool = { HOME: m.pool_home, DRAW: m.pool_draw, AWAY: m.pool_away };
  const total = poolTotal3(pool);
  const kickoff = new Date(m.fixture.kickoff_at);

  return (
    <Link
      to="/football/$marketId"
      params={{ marketId: m.id }}
      className="block rounded-2xl border bg-card/60 p-4 transition hover:border-primary/30 hover:bg-surface/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {copy.football.leagueLabel} {m.fixture.api_league_id} ·{" "}
            {format(kickoff, "dd MMM HH:mm", { locale: ptBR })}
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-sm font-semibold">
            {m.fixture.home_logo_url && (
              <img
                src={m.fixture.home_logo_url}
                alt=""
                className="size-5 object-contain"
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
                className="size-5 object-contain"
                loading="lazy"
              />
            )}
          </h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium",
            isSettledDisplay(m.status)
              ? "bg-muted text-muted-foreground"
              : "bg-primary/15 text-primary",
          )}
        >
          {statusLabel(m.status)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <OutcomeChip
          label={copy.football.home}
          pct={probability3(pool, "HOME")}
          highlight={m.winning_outcome === "HOME"}
        />
        <OutcomeChip
          label={copy.football.draw}
          pct={probability3(pool, "DRAW")}
          highlight={m.winning_outcome === "DRAW"}
        />
        <OutcomeChip
          label={copy.football.away}
          pct={probability3(pool, "AWAY")}
          highlight={m.winning_outcome === "AWAY"}
        />
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">
        {copy.football.poolTotal}: R$ {total.toLocaleString("pt-BR")} · {m.participants}{" "}
        {copy.football.participants}
      </p>
    </Link>
  );
}

function OutcomeChip({
  label,
  pct,
  highlight,
}: {
  label: string;
  pct: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2 py-2",
        highlight ? "border-primary/50 bg-primary/10" : "border-border/60 bg-background/40",
      )}
    >
      <div className="font-medium">{label}</div>
      <div className="mt-0.5 text-muted-foreground">{formatPct(pct)}</div>
    </div>
  );
}
