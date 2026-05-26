import { Link } from "@tanstack/react-router";
import { useFootballMarkets } from "@/hooks/use-football-markets";
import { useFootballEnabled } from "@/hooks/use-football-enabled";
import { useFootballRealtime } from "@/hooks/use-football-realtime";
import { FootballMarketCard } from "@/components/football/football-market-card";
import { FootballMarketsCarousel } from "@/components/football/football-markets-carousel";
import { MarketCardSkeleton } from "@/components/viax/market-card-skeleton";
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
    <div className={embedded ? "space-y-4" : "space-y-6"}>
      {isLoading && (
        <>
          <div className="md:hidden space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))}
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {error && <InlineError message={error.message} onRetry={() => void refetch()} />}

      {!isLoading && !error && markets?.length === 0 && (
        <EmptyState title={copy.football.emptyTitle} description={copy.football.emptyDesc} />
      )}

      {!isLoading && !error && markets && markets.length > 0 && (
        <>
          <FootballMarketsCarousel markets={markets} className="md:hidden" />
          <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
            {markets.map((m) => (
              <FootballMarketCard key={m.id} m={m} />
            ))}
          </div>
        </>
      )}

      {!embedded && (
        <p className="text-center text-xs text-muted-foreground">
          <Link
            to="/markets"
            search={{ segment: "transito", status: "live" }}
            className="text-primary hover:underline"
          >
            {copy.football.backUrban}
          </Link>
        </p>
      )}
    </div>
  );
}
