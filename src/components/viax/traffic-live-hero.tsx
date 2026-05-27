import { Link } from "@tanstack/react-router";
import { MarketCard } from "@/components/viax/market-card";
import { copy } from "@/copy/pt-BR";
import type { Market } from "@/store/viax-store";
import { Radio } from "lucide-react";

export function TrafficLiveHero({ market }: { market: Market }) {
  return (
    <section className="space-y-2" aria-labelledby="traffic-live-heading">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-up opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-up" />
        </span>
        <h2 id="traffic-live-heading" className="text-sm font-semibold uppercase tracking-wider text-up">
          <Radio className="mr-1 inline size-3.5" />
          {copy.traffic.liveHeroTitle}
        </h2>
      </div>
      <p className="text-xs text-muted-foreground">{copy.traffic.liveHeroHint}</p>
      <Link to="/markets/$marketId" params={{ marketId: market.id }} className="block">
        <MarketCard m={market} />
      </Link>
    </section>
  );
}
