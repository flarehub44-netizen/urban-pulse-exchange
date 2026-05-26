import { useState, useEffect } from "react";
import { X, Zap } from "lucide-react";
import { COMEBACK_KEY } from "@/components/viax/retention-boot";

interface ComebackBannerProps {
  newMarketsCount: number;
}

export function ComebackBanner({ newMarketsCount }: ComebackBannerProps) {
  const [daysAway, setDaysAway] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(COMEBACK_KEY);
    if (stored) setDaysAway(Number(stored));
  }, []);

  if (!daysAway) return null;

  const dismiss = () => {
    localStorage.removeItem(COMEBACK_KEY);
    setDaysAway(null);
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-primary/30 bg-primary/8 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Zap className="size-4 shrink-0 text-primary" />
          Você estava fora por{" "}
          <span className="text-primary">
            {daysAway} dia{daysAway !== 1 ? "s" : ""}
          </span>{" "}
          — bem-vindo de volta!
        </p>
        {newMarketsCount > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {newMarketsCount} mercado{newMarketsCount !== 1 ? "s" : ""} novo
            {newMarketsCount !== 1 ? "s" : ""} desde sua última visita. Seu streak te espera abaixo.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground"
        aria-label="Fechar"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
