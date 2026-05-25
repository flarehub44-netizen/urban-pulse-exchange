import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { usePublicCommunityMarkets, useMyCommunityMarkets } from "@/hooks/use-community-markets";
import { MarketCard } from "@/components/viax/market-card";
import { MarketCardSkeleton } from "@/components/viax/market-card-skeleton";
import { InlineError } from "@/components/viax/inline-error";
import { EmptyState } from "@/components/viax/empty-state";
import { PageHeader } from "@/components/viax/page-header";
import { copy } from "@/copy/pt-BR";
import { useAuth } from "@/hooks/use-auth";

export function CommunityMarketsList({ embedded = false }: { embedded?: boolean }) {
  const { isRegistered } = useAuth();
  const { data: publicMarkets = [], isLoading, isError, refetch } = usePublicCommunityMarkets();
  const { data: myMarkets = [] } = useMyCommunityMarkets(isRegistered);

  return (
    <div className="space-y-5">
      {embedded ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            to="/markets/create"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" />
            {copy.community.createLink}
          </Link>
        </div>
      ) : (
        <div className="page-section flex flex-wrap items-end justify-between gap-4">
          <PageHeader
            title={<span className="text-highlight">{copy.community.listTitle}</span>}
            description={copy.community.listSubtitle}
            className="flex-1 min-w-[200px]"
          />
          <Link
            to="/markets/create"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" />
            {copy.community.createLink}
          </Link>
        </div>
      )}

      {isRegistered && myMarkets.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{copy.community.myMarkets}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myMarkets.map((m) => (
              <MarketCard key={`mine-${m.id}`} m={m} />
            ))}
          </div>
        </section>
      )}

      {isError && <InlineError onRetry={() => refetch()} />}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && !isError && publicMarkets.length === 0 && (
        <EmptyState
          title={copy.empty.markets.title}
          description={copy.community.listSubtitle}
          action={{ label: copy.community.createLink, to: "/markets/create" }}
        />
      )}

      {!isLoading && !isError && publicMarkets.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Públicos</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publicMarkets.map((m) => (
              <MarketCard key={m.id} m={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
