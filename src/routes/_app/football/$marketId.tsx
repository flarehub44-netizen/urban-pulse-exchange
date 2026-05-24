import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFootballMarket } from "@/hooks/use-football-markets";
import { useFootballRealtime } from "@/hooks/use-football-realtime";
import { FootballOrderBox } from "@/components/football/football-order-box";
import { InlineError } from "@/components/viax/inline-error";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/football/$marketId")({
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
        isLive
          ? "border-up/30 bg-up/5"
          : "border-border bg-surface/50",
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
        <Link to="/football" className="mt-4 inline-block text-sm text-primary hover:underline">
          {copy.football.backList}
        </Link>
      </div>
    );
  }

  const kickoff = new Date(m.fixture.kickoff_at);
  const { status_short, elapsed, goals_home, goals_away, home_team_name, away_team_name } =
    m.fixture;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link to="/football" className="text-xs text-primary hover:underline">
        ← {copy.football.backList}
      </Link>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {format(kickoff, "EEEE, dd MMM yyyy · HH:mm", { locale: ptBR })}
        </p>
        <h1 className="mt-2 text-xl font-semibold">
          {home_team_name} x {away_team_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.question}</p>
      </div>

      <LiveScoreBadge
        home={home_team_name}
        away={away_team_name}
        homeGoals={goals_home}
        awayGoals={goals_away}
        statusShort={status_short}
        elapsed={elapsed}
      />

      <FootballOrderBox m={m} />
    </div>
  );
}
