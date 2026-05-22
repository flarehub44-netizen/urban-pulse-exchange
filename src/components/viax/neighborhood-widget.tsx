import { MapPin, TrendingUp } from "lucide-react";
import { useBets } from "@/hooks/use-bets";
import { useViaX } from "@/store/viax-store";

interface Props {
  neighborhood: string | null;
  city?: string;
}

export function NeighborhoodWidget({ neighborhood, city = "São Paulo" }: Props) {
  const { data: bets } = useBets();
  const markets = useViaX((s) => s.markets);

  const location = neighborhood || city;

  const neighborhoodBets = (bets ?? []).filter((b) => {
    if (!neighborhood) return false;
    return b.marketRegion.toLowerCase().includes(neighborhood.toLowerCase());
  });

  const resolved = neighborhoodBets.filter((b) => b.payout != null);
  const wins = resolved.filter((b) => (b.payout ?? 0) > 0);
  const accuracy = resolved.length > 0 ? Math.round((wins.length / resolved.length) * 100) : null;

  const localMarkets = markets.filter((m) => {
    if (!neighborhood) return false;
    return (
      (m.status === "live" || m.status === "closing") &&
      m.region.toLowerCase().includes(neighborhood.toLowerCase())
    );
  });

  if (!neighborhood || (neighborhoodBets.length === 0 && localMarkets.length === 0)) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <MapPin className="size-3.5" />
        {location} esta semana
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border bg-surface/60 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Apostas</div>
          <div className="mono mt-1 text-lg font-semibold">{neighborhoodBets.length}</div>
        </div>
        <div className="rounded-xl border bg-surface/60 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Acertos</div>
          <div className="mono mt-1 text-lg font-semibold text-up">{wins.length}</div>
        </div>
        <div className="rounded-xl border bg-surface/60 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Precisão</div>
          <div className="mono mt-1 text-lg font-semibold">
            {accuracy !== null ? (
              <span className={accuracy >= 60 ? "text-up" : "text-down"}>{accuracy}%</span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>
        </div>
      </div>

      {localMarkets.length > 0 && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-primary font-medium">
            <TrendingUp className="size-3" />
            {localMarkets.length} mercado{localMarkets.length > 1 ? "s" : ""} ativo
            {localMarkets.length > 1 ? "s" : ""} no seu bairro agora
          </div>
        </div>
      )}
    </div>
  );
}
