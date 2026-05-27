import { Link } from "@tanstack/react-router";
import { ArrowRight, Flag, Map, Sparkles } from "lucide-react";
import { useCatalogMarkets } from "@/hooks/use-markets";
import { useFootballMarkets } from "@/hooks/use-football-markets";
import { usePublicCommunityMarkets } from "@/hooks/use-community-markets";
import { MarketCard } from "@/components/viax/market-card";
import { FootballMarketCard } from "@/components/football/football-market-card";
import { FootballMarketsCarousel } from "@/components/football/football-markets-carousel";
import { MobileMarketsCarousel } from "@/components/viax/mobile-markets-carousel";
import { sortByCatalogTier } from "@/lib/market-status";
import { copy } from "@/copy/pt-BR";

function SegmentBlock({
  icon: Icon,
  label,
  segment,
  children,
  empty,
}: {
  icon: typeof Map;
  label: string;
  segment: "transito" | "futebol" | "outros";
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-primary" />
          {label}
        </div>
        <Link
          to="/markets"
          search={{ segment }}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {copy.landing.seeAllSegment} <ArrowRight className="size-3" />
        </Link>
      </div>
      {empty ? (
        <div className="rounded-xl border border-dashed bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
          <p>{copy.landing.liveMarketsEmpty}</p>
          {segment === "outros" && (
            <Link
              to="/markets/create"
              className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              {copy.landing.createMarketCta}
            </Link>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function LandingLiveMarkets() {
  const urban = useCatalogMarkets();
  const { data: football = [], isLoading: footballLoading } = useFootballMarkets();
  const { data: community = [], isLoading: communityLoading } = usePublicCommunityMarkets();

  const urbanSlice = sortByCatalogTier(urban).slice(0, 3);
  const footballSlice = sortByCatalogTier(football)
    .filter((m) => m.status === "live" || m.status === "closing")
    .slice(0, 3);
  const communitySlice = sortByCatalogTier(community).slice(0, 3);

  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-primary">
            {copy.landing.liveMarketsEyebrow}
          </div>
          <h2 className="heading-page mt-2 text-3xl md:text-4xl">
            {copy.landing.liveMarketsTitle}
          </h2>
          <p className="text-lead mx-auto mt-3 max-w-2xl">{copy.landing.liveMarketsBody}</p>
        </div>

        <div className="mt-12 space-y-14">
          <SegmentBlock
            icon={Map}
            label={copy.landing.segmentTransitoTitle}
            segment="transito"
            empty={urbanSlice.length === 0}
          >
            <MobileMarketsCarousel markets={urbanSlice} className="md:hidden" />
            <div className="hidden gap-4 md:grid md:grid-cols-3">
              {urbanSlice.map((m) => (
                <MarketCard key={m.id} m={m} />
              ))}
            </div>
          </SegmentBlock>

          <SegmentBlock
            icon={Flag}
            label={copy.landing.segmentFutebolTitle}
            segment="futebol"
            empty={!footballLoading && footballSlice.length === 0}
          >
            {footballLoading ? (
              <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
            ) : (
              <>
                <FootballMarketsCarousel markets={footballSlice} className="md:hidden" />
                <div className="hidden gap-4 md:grid md:grid-cols-3">
                  {footballSlice.map((m) => (
                    <FootballMarketCard key={m.id} m={m} compact />
                  ))}
                </div>
              </>
            )}
          </SegmentBlock>

          <SegmentBlock
            icon={Sparkles}
            label={copy.landing.segmentOutrosTitle}
            segment="outros"
            empty={!communityLoading && communitySlice.length === 0}
          >
            {communityLoading ? (
              <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
            ) : (
              <>
                <MobileMarketsCarousel markets={communitySlice} className="md:hidden" />
                <div className="hidden gap-4 md:grid md:grid-cols-3">
                  {communitySlice.map((m) => (
                    <MarketCard key={m.id} m={m} />
                  ))}
                </div>
              </>
            )}
          </SegmentBlock>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/markets"
            search={{ segment: "transito" }}
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 font-medium hover:bg-surface-2"
          >
            {copy.landing.ctaMarkets} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
