import type { Market } from "@/store/viax-store";
import { MarketCard } from "@/components/viax/market-card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

export function MobileMarketsCarousel({
  markets,
  className,
}: {
  markets: Market[];
  className?: string;
}) {
  if (markets.length === 0) return null;
  return (
    <div className={className}>
      <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
        <CarouselContent className="-ml-3">
          {markets.map((m) => (
            <CarouselItem key={m.id} className="basis-[88%] pl-3 sm:basis-[70%] md:basis-[45%]">
              <MarketCard m={m} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
