import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  binarySideFromOutcomeId,
  footballOutcomeFromId,
  type CatalogMarket,
} from "@/lib/catalog-market";
import { formatPct } from "@/lib/parimutuel";
import { cn } from "@/lib/utils";
import { usePlaceBet } from "@/hooks/use-place-bet";
import { usePlaceFootballBet } from "@/hooks/use-place-football-bet";
import { usePlaceCryptoSlotBet } from "@/hooks/use-crypto-slot";
import { usePlaceOutcomeBet } from "@/hooks/use-place-outcome-bet";
import { useAuthPublic } from "@/hooks/use-auth-public";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";

type MarketQuickBetRouterProps = {
  market: CatalogMarket;
  className?: string;
};

export function MarketQuickBetRouter({ market, className }: MarketQuickBetRouterProps) {
  const { isRegistered } = useAuthPublic();
  const placeBet = usePlaceBet();
  const placeFootball = usePlaceFootballBet();
  const placeCrypto = usePlaceCryptoSlotBet();
  const placeOutcome = usePlaceOutcomeBet();

  const handleQuick = async (outcomeId: string, stake = 50) => {
    if (!isRegistered) return;
    const key = crypto.randomUUID();
    if (market.type === "binary") {
      await placeBet.mutateAsync({
        marketId: market.id,
        side: binarySideFromOutcomeId(outcomeId),
        stake,
        idempotencyKey: key,
      });
    } else if (market.type === "football_1x3") {
      await placeFootball.mutateAsync({
        marketId: market.id,
        outcome: footballOutcomeFromId(outcomeId),
        stake,
        idempotencyKey: key,
      });
    } else if (market.type === "crypto_slot") {
      await placeCrypto.mutateAsync({
        data: {
          marketId: market.id,
          side: outcomeId === "down" ? "down" : "up",
          stake,
        },
      });
    } else if (market.type === "multi_outcome") {
      await placeOutcome.mutateAsync({
        marketId: market.id,
        outcomeId,
        stake,
        idempotencyKey: key,
      });
    }
  };

  const maxOutcomes = market.type === "football_1x3" ? 3 : market.type === "multi_outcome" ? 4 : 2;
  const outcomes = market.outcomes.slice(0, maxOutcomes);

  if (!isRegistered) {
    return (
      <div className={className}>
        <AuthModalTrigger
          mode="signup"
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Entrar para apostar
        </AuthModalTrigger>
      </div>
    );
  }

  return (
    <div className={className}>
      {outcomes.map((o, i) => (
        <button
          key={o.id}
          type="button"
          disabled={
            placeBet.isPending ||
            placeFootball.isPending ||
            placeCrypto.isPending ||
            placeOutcome.isPending
          }
          onClick={() => void handleQuick(o.id)}
          className={cn(
            "rounded-lg px-2 py-2 text-xs font-semibold transition",
            i === 0 && "bg-up/15 text-up hover:bg-up/25",
            i === 1 &&
              market.type === "football_1x3" &&
              "bg-muted text-foreground hover:bg-muted/80",
            i === 1 && market.type === "binary" && "bg-down/15 text-down hover:bg-down/25",
            i === 2 && "bg-down/15 text-down hover:bg-down/25",
          )}
        >
          {o.label} {formatPct(o.probability, 0)}
        </button>
      ))}
      <Link
        to={market.detailPath}
        className="col-span-full text-center text-xs text-primary hover:underline"
      >
        Ver mercado
      </Link>
    </div>
  );
}
