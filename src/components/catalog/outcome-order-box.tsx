import { useState } from "react";
import { estimatePayoutN } from "@/lib/parimutuel-n";
import { formatBRL } from "@/lib/parimutuel";
import type { CatalogMarket } from "@/lib/catalog-market";
import { usePlaceOutcomeBet } from "@/hooks/use-place-outcome-bet";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

const PRESETS = [50, 100, 250, 500];

type OutcomeOrderBoxProps = {
  market: CatalogMarket;
  initialOutcomeId?: string;
  onSuccess?: () => void;
};

export function OutcomeOrderBox({ market, initialOutcomeId, onSuccess }: OutcomeOrderBoxProps) {
  const { data: profile } = useProfile();
  const mutation = usePlaceOutcomeBet();
  const [outcomeId, setOutcomeId] = useState(initialOutcomeId ?? market.outcomes[0]?.id ?? "");
  const [stake, setStake] = useState(100);

  const pools = market.outcomes.map((o) => ({ id: o.id, pool: o.pool }));
  const est = estimatePayoutN(pools, outcomeId, stake);
  const balance = profile?.balance ?? 0;

  const submit = async () => {
    await mutation.mutateAsync({
      marketId: market.id,
      outcomeId,
      stake,
      idempotencyKey: crypto.randomUUID(),
    });
    onSuccess?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {market.outcomes.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOutcomeId(o.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm",
              outcomeId === o.id ? "border-primary bg-primary/10" : "border-border",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setStake(p)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm",
              stake === p ? "border-primary bg-primary/10" : "border-border",
            )}
          >
            {formatBRL(p)}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Retorno estimado: <span className="font-medium text-foreground">{formatBRL(est)}</span>
        {" · "}Saldo: {formatBRL(balance)}
      </p>
      <button
        type="button"
        disabled={mutation.isPending || balance < stake || !outcomeId}
        onClick={() => void submit()}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {mutation.isPending ? "Confirmando…" : "Confirmar previsão"}
      </button>
      {mutation.error && <p className="text-sm text-down">{mutation.error.message}</p>}
    </div>
  );
}
