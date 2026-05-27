import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFootballMarket } from "@/hooks/use-football-markets";
import { useFootballRealtime } from "@/hooks/use-football-realtime";
import { FootballOrderBox } from "@/components/football/football-order-box";
import { InlineError } from "@/components/viax/inline-error";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";
import { Countdown } from "@/components/viax/countdown";
import { formatBRL } from "@/lib/parimutuel";
import { poolTotal3, prizePool3, probability3 } from "@/lib/football-parimutuel";
import { Users } from "lucide-react";

export const Route = createFileRoute("/football/$marketId")({
  component: FootballMarketPage,
});

const LIVE_STATUS = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "SUSP", "INT"]);
const FINISHED_STATUS = new Set(["FT", "AET", "PEN"]);

function LiveScoreBadge({
  home,
  away,
  homeGoals,
  awayGoals,
  statusShort,
  elapsed,
}: {
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  statusShort: string;
  elapsed: number | null;
}) {
  const isLive = LIVE_STATUS.has(statusShort);
  const isFinished = FINISHED_STATUS.has(statusShort);

  if (!isLive && !isFinished) return null;

  const scoreHome = homeGoals ?? 0;
  const scoreAway = awayGoals ?? 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border px-5 py-4",
        isLive ? "border-up/30 bg-up/5" : "border-border bg-surface/50",
      )}
    >
      <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
        <span className="text-xs text-muted-foreground truncate max-w-[90px]">{home}</span>
        <span className="text-3xl font-bold mono">{scoreHome}</span>
      </div>

      <div className="flex flex-col items-center gap-1 px-4">
        {isLive ? (
          <>
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-up">
              <span className="size-1.5 rounded-full bg-up animate-pulse inline-block" />
              Ao vivo
            </span>
            <span className="text-xs text-muted-foreground">
              {statusShort === "HT" ? "Intervalo" : elapsed != null ? `${elapsed}'` : statusShort}
            </span>
          </>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">Encerrado</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
        <span className="text-xs text-muted-foreground truncate max-w-[90px]">{away}</span>
        <span className="text-3xl font-bold mono">{scoreAway}</span>
      </div>
    </div>
  );
}

function FootballMarketPage() {
  const { marketId } = Route.useParams();
  useFootballRealtime();
  const { data: m, isLoading, error, refetch } = useFootballMarket(marketId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{copy.common.loading}</p>;
  }
  if (error) {
    return <InlineError message={error.message} onRetry={() => void refetch()} />;
  }
  if (!m) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{copy.football.notFound}</p>
        <Link
          to="/markets"
          search={{ segment: "futebol" }}
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          {copy.football.backList}
        </Link>
      </div>
    );
  }

  const kickoff = new Date(m.fixture.kickoff_at);
  const { status_short, elapsed, goals_home, goals_away, home_team_name, away_team_name } =
    m.fixture;
  const pool = { HOME: m.pool_home, DRAW: m.pool_draw, AWAY: m.pool_away } as const;
  const pHome = probability3(pool, "HOME");
  const pAway = probability3(pool, "AWAY");
  const totalPool = poolTotal3(pool);
  const totalPrize = prizePool3(pool);
  const tabs = [
    { key: "bet", label: "Apostar", disabled: false },
    { key: "chart", label: "Gráfico", disabled: true },
    { key: "predictions", label: "Previsões", disabled: true },
    { key: "comments", label: "Comentários", disabled: true },
    { key: "audit", label: "Auditoria", disabled: true },
  ];

  return (
    <div className="space-y-5">
      <Link
        to="/markets"
        search={{ segment: "futebol" }}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← {copy.football.backList}
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5 min-w-0">
          <div className="surface-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {format(kickoff, "EEEE, dd MMM yyyy · HH:mm", { locale: ptBR })}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              {home_team_name} x {away_team_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{m.question}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>
                Encerra em <Countdown to={new Date(m.betting_closes_at)} className="text-foreground" />
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" /> {m.participants} participantes
              </span>
              <span>
                Volume no mercado <span className="mono text-foreground">{formatBRL(totalPool)}</span>
              </span>
              <span>
                Prêmio total <span className="mono text-foreground">{formatBRL(totalPrize)}</span>
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="glass-strong rounded-xl border border-up/30 bg-up/5 p-4 shadow-[var(--shadow-glow-up)]">
                <div className="text-xs uppercase tracking-wider text-up">↑ {home_team_name}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold text-up mono">{(pHome * 100).toFixed(1)}</span>
                  <span className="text-sm text-up/70">%</span>
                </div>
                <div className="mt-1 text-[11px] mono text-muted-foreground">{formatBRL(m.pool_home)}</div>
              </div>
              <div className="glass-strong rounded-xl border border-down/30 bg-down/5 p-4 shadow-[var(--shadow-glow-down)]">
                <div className="text-xs uppercase tracking-wider text-down">↓ {away_team_name}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold text-down mono">{(pAway * 100).toFixed(1)}</span>
                  <span className="text-sm text-down/70">%</span>
                </div>
                <div className="mt-1 text-[11px] mono text-muted-foreground">{formatBRL(m.pool_away)}</div>
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <div className="h-full bg-up" style={{ width: `${Math.max(0, Math.min(100, pHome * 100))}%` }} />
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-wider text-warn">Zona quente</div>
          </div>

          <div className="flex gap-1 rounded-xl border bg-card/40 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                disabled={t.disabled}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition",
                  t.key === "bet"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <LiveScoreBadge
            home={home_team_name}
            away={away_team_name}
            homeGoals={goals_home}
            awayGoals={goals_away}
            statusShort={status_short}
            elapsed={elapsed}
          />
        </div>

        <div id="order-box-panel" className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <FootballOrderBox m={m} />
        </div>
      </div>
    </div>
  );
}
