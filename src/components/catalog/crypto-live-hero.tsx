import { TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { CatalogMarket } from "@/lib/catalog-market";
import { formatBRL, formatPct } from "@/lib/parimutuel";
import { usePlaceCryptoSlotBet } from "@/hooks/use-crypto-slot";
import { useAuthPublic } from "@/hooks/use-auth-public";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { cn } from "@/lib/utils";

function msRemaining(endsAt: string) {
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

function formatCountdown(ms: number) {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CryptoLiveHero({ market }: { market: CatalogMarket }) {
  const { isRegistered } = useAuthPublic();
  const { mutateAsync: bet, isPending } = usePlaceCryptoSlotBet();
  const up = market.outcomes.find((o) => o.slug === "up");
  const down = market.outcomes.find((o) => o.slug === "down");
  const remaining = formatCountdown(msRemaining(market.endsAt));

  const onBet = async (side: "up" | "down") => {
    try {
      await bet({ data: { marketId: market.id, side, stake: 50 } });
      toast.success("Aposta registrada no slot crypto");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao apostar");
    }
  };

  return (
    <section
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-card/40 p-5"
      aria-labelledby="crypto-slot-heading"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Slot curto</p>
          <h2 id="crypto-slot-heading" className="text-base font-semibold">
            {market.question}
          </h2>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium tabular-nums text-primary">
          {remaining}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Volume {formatBRL(market.volume)} · {market.participants} participantes
      </p>
      {!isRegistered ? (
        <AuthModalTrigger
          mode="signup"
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Entrar para apostar
        </AuthModalTrigger>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => void onBet("up")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border border-up/40 bg-up/10 px-4 py-3 text-sm font-semibold text-up hover:bg-up/20",
            )}
          >
            <TrendingUp className="size-4" />
            Sobe {up ? formatPct(up.probability, 0) : ""}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => void onBet("down")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border border-down/40 bg-down/10 px-4 py-3 text-sm font-semibold text-down hover:bg-down/20",
            )}
          >
            <TrendingDown className="size-4" />
            Desce {down ? formatPct(down.probability, 0) : ""}
          </button>
        </div>
      )}
    </section>
  );
}
