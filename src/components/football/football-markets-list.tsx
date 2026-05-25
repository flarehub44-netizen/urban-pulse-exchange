import { Link } from "@tanstack/react-router";
import { useFootballMarkets } from "@/hooks/use-football-markets";
import { useFootballEnabled } from "@/hooks/use-football-enabled";
import { useFootballRealtime } from "@/hooks/use-football-realtime";
import { FootballMarketCard } from "@/components/football/football-market-card";
import { InlineError } from "@/components/viax/inline-error";
import { EmptyState } from "@/components/viax/empty-state";
import { copy } from "@/copy/pt-BR";

type FootballMarketsListProps = {
  embedded?: boolean;
};

export function FootballMarketsList({ embedded = false }: FootballMarketsListProps) {
  useFootballRealtime();
  const { data: enabled, isLoading: enabledLoading } = useFootballEnabled();
  const { data: markets, isLoading, error, refetch } = useFootballMarkets();

  if (!enabledLoading && enabled === false) {
    return <p className="text-sm text-muted-foreground">{copy.football.disabled}</p>;
  }

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-3xl space-y-6"}>
      {isLoading && <p className="text-sm text-muted-foreground">{copy.common.loading}</p>}
      {error && <InlineError message={error.message} onRetry={() => void refetch()} />}

      {!isLoading && !error && markets?.length === 0 && (
        <EmptyState title={copy.football.emptyTitle} description={copy.football.emptyDesc} />
      )}

      <div className="space-y-3">
        {markets?.map((m) => (
          <FootballMarketCard key={m.id} m={m} />
        ))}
      </div>

      {!embedded && (
        <p className="text-center text-xs text-muted-foreground">
          <Link
            to="/markets"
            search={{ segment: "futebol" }}
            className="text-primary hover:underline"
          >
            {copy.football.backUrban}
          </Link>
        </p>
      )}
    </div>
  );
}
