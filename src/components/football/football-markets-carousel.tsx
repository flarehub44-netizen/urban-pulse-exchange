import type { FootballMarketRow } from "@/hooks/use-football-markets";
import { FootballMarketCard } from "@/components/football/football-market-card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

export function FootballMarketsCarousel({
  markets,
  className,
}: {
  markets: FootballMarketRow[];
  className?: string;
}) {
  if (markets.length === 0) return null;
  return (
    <div className={className}>
      <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
        <CarouselContent className="-ml-3">
          {markets.map((m) => (
            <CarouselItem key={m.id} className="basis-[88%] pl-3 sm:basis-[70%] md:basis-[45%]">
              <FootballMarketCard m={m} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
