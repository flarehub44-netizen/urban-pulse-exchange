import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useBets } from "@/hooks/use-bets";
import { useMarkets } from "@/hooks/use-markets";
import { useViaX } from "@/store/viax-store";

const ALERT_KEY = "viax_closing_alerted";
const WINDOW_MS = 10 * 60 * 1000;

function getAlerted(): Set<string> {
  try {
    const raw = sessionStorage.getItem(ALERT_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function markAlerted(id: string) {
  const s = getAlerted();
  s.add(id);
  sessionStorage.setItem(ALERT_KEY, JSON.stringify([...s]));
}

/** Toast when a market with user position closes within 10 minutes. */
export function useClosingMarketAlerts() {
  const navigate = useNavigate();
  const { data: bets } = useBets();
  const { data: dbMarkets } = useMarkets();
  const zustandMarkets = useViaX((s) => s.markets);
  const markets = dbMarkets ?? zustandMarkets;
  useEffect(() => {
    const open = (bets ?? []).filter((b) => b.marketStatus !== "resolved");
    if (!open.length || !markets.length) return;

    const now = Date.now();
    for (const bet of open) {
      const m = markets.find((x) => x.id === bet.marketId);
      if (!m || m.status === "resolved") continue;
      const msLeft = m.endsAt - now;
      if (msLeft <= 0 || msLeft > WINDOW_MS) continue;
      const key = `${m.id}-${Math.floor(m.endsAt / 60_000)}`;
      if (getAlerted().has(key)) continue;
      markAlerted(key);
      const mins = Math.max(1, Math.ceil(msLeft / 60_000));
      toast.warning(`Mercado encerra em ~${mins} min`, {
        description: m.question.slice(0, 60),
        action: {
          label: "Abrir mercado",
          onClick: () =>
            navigate({
              to: "/markets/$marketId",
              params: { marketId: m.id },
            }),
        },
      });
    }
  }, [bets, markets, navigate]);
}
