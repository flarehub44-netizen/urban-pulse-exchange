import { createFileRoute, Link } from "@tanstack/react-router";
import { useFootballMarkets } from "@/hooks/use-football-markets";
import { useFootballEnabled } from "@/hooks/use-football-enabled";
import { useFootballRealtime } from "@/hooks/use-football-realtime";
import { FootballMarketCard } from "@/components/football/football-market-card";
import { PageHeader } from "@/components/viax/page-header";
import { InlineError } from "@/components/viax/inline-error";
import { EmptyState } from "@/components/viax/empty-state";
import { copy } from "@/copy/pt-BR";
import { DepositFunnelBannerSlot } from "@/components/viax/deposit-funnel-banner-slot";

export const Route = createFileRoute("/_app/football/")({
  head: () => ({
    meta: [
      { title: copy.football.metaTitle },
      { name: "description", content: copy.football.metaDescription },
    ],
  }),
  component: FootballListPage,
});

function FootballListPage() {
  useFootballRealtime();
  const { data: enabled, isLoading: enabledLoading } = useFootballEnabled();
  const { data: markets, isLoading, error, refetch } = useFootballMarkets();

  if (!enabledLoading && enabled === false) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title={copy.football.title} subtitle={copy.football.subtitle} />
        <p className="text-sm text-muted-foreground">{copy.football.disabled}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DepositFunnelBannerSlot />
      <PageHeader title={copy.football.title} subtitle={copy.football.subtitle} />

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

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/markets" className="text-primary hover:underline">
          {copy.football.backUrban}
        </Link>
      </p>
    </div>
  );
}
