import { useEffect } from "react";
import { useViaX } from "@/store/viax-store";
import { useMarkets } from "@/hooks/use-markets";

/**
 * Atualização visual leve das regiões carregadas no store (sem animação de mercados mock).
 */
export function useRealtimeTick(intervalMs = 1600) {
  const tickRegions = useViaX((s) => s.tick);
  const { data: dbMarkets, isFetched } = useMarkets();

  useEffect(() => {
    if (isFetched && dbMarkets && dbMarkets.length > 0) return;

    const id = setInterval(() => {
      tickRegions();
    }, intervalMs);
    return () => clearInterval(id);
  }, [tickRegions, intervalMs, dbMarkets, isFetched]);
}
