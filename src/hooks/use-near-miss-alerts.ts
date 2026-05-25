import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCasinoEnabled } from "@/hooks/use-casino-enabled";
import {
  canShowNearMissToast,
  recordNearMissToast,
  suggestImpulseDeposit,
  type NearMissMeta,
} from "@/lib/near-miss";
import type { NearMissPayload } from "@/components/viax/near-miss-modal";

export function useRecentNearMiss() {
  const { userId } = useAuth();
  const { enabled } = useCasinoEnabled();
  return useQuery({
    queryKey: ["casino", "near-miss", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recent_near_miss");
      if (error) throw error;
      return data as {
        id?: number;
        market_id?: string;
        question?: string;
        meta?: NearMissMeta;
        created_at?: string;
      } | null;
    },
    enabled: !!userId && enabled,
    staleTime: 15_000,
  });
}

/** Escuta bets com payout=0 e abre modal near-miss (máx. 3/sessão). */
export function useNearMissAlerts(userId: string | null) {
  const { enabled } = useCasinoEnabled();
  const qc = useQueryClient();
  const [payload, setPayload] = useState<NearMissPayload | null>(null);
  const [open, setOpen] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || !enabled) return;

    const channel = supabase
      .channel(`near-miss-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bets",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            payout?: number | null;
            market_id?: string;
            stake?: number;
          };
          if (row.payout !== 0 || row.payout == null) return;
          const id = row.id;
          if (!id || seenIds.current.has(id)) return;
          if (!canShowNearMissToast()) return;

          seenIds.current.add(id);
          recordNearMissToast();
          const stake = Number((payload.new as { stake?: number }).stake ?? 0);
          setPayload({
            marketId: row.market_id,
            meta: { stake },
            suggestedDeposit: suggestImpulseDeposit(stake),
          });
          setOpen(true);
          qc.invalidateQueries({ queryKey: ["casino", "near-miss"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, enabled, qc]);

  return {
    open,
    setOpen,
    payload,
    setPayload,
    close: () => setOpen(false),
  };
}
