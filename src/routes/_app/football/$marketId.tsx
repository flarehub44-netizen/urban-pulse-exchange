import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFootballMarket } from "@/hooks/use-football-markets";
import { useFootballRealtime } from "@/hooks/use-football-realtime";
import { FootballOrderBox } from "@/components/football/football-order-box";
import { InlineError } from "@/components/viax/inline-error";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/_app/football/$marketId")({
  component: FootballMarketPage,
});

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
          {m.fixture.home_team_name} x {m.fixture.away_team_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{m.question}</p>
      </div>

      <FootballOrderBox m={m} />
    </div>
  );
}
