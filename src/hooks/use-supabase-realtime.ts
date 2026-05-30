import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapNotification } from "@/hooks/use-notifications";
import { mapMarket } from "@/hooks/use-markets";
import type { Market, ViaXNotification } from "@/store/viax-store";

export function useSupabaseRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Coalesce bursts of market updates into one cache write per frame to
    // avoid O(N*M) re-renders during high-traffic events.
    const pendingMarkets = new Map<string, Market>();
    let flushHandle: number | null = null;
    const flush = () => {
      flushHandle = null;
      if (pendingMarkets.size === 0) return;
      const patches = new Map(pendingMarkets);
      pendingMarkets.clear();
      queryClient.setQueryData<Market[]>(["markets"], (old) =>
        old?.map((m) => {
          const u = patches.get(m.id);
          return u ? { ...m, pool: u.pool, participants: u.participants } : m;
        }) ?? old,
      );
    };
    const schedule = () => {
      if (flushHandle !== null) return;
      flushHandle =
        typeof requestAnimationFrame !== "undefined"
          ? requestAnimationFrame(flush)
          : (setTimeout(flush, 50) as unknown as number);
    };

    // Channel 1 — market pool updates (real bets from any session)
    const marketsCh = supabase
      .channel("markets-pool", { config: { private: true } })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "markets" },
        (payload) => {
          const updated = mapMarket(payload.new as Record<string, unknown>);
          pendingMarkets.set(updated.id, updated);
          schedule();
        },
      )
      .subscribe();

    // Channel 2 — new feed posts
    const feedCh = supabase
      .channel("feed-live", { config: { private: true } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_posts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        queryClient.invalidateQueries({ queryKey: ["engagement", "snapshot"] });
      })
      .subscribe();

    // Channel 3 — notifications for current user
    let notifCh: ReturnType<typeof supabase.channel> | null = null;

    const setupNotifChannel = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      notifCh = supabase
        .channel(`notifications:${userId}`, { config: { private: true } })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const notif = mapNotification(payload.new as Record<string, unknown>);
            queryClient.setQueryData<ViaXNotification[]>(["notifications"], (old) => [
              notif,
              ...(old ?? []),
            ]);
            queryClient.invalidateQueries({ queryKey: ["engagement", "snapshot"] });
            toast(notif.text);
          },
        )
        .subscribe();
    };

    setupNotifChannel();

    return () => {
      if (flushHandle !== null) {
        if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(flushHandle);
        else clearTimeout(flushHandle);
      }
      supabase.removeChannel(marketsCh);
      supabase.removeChannel(feedCh);
      if (notifCh) supabase.removeChannel(notifCh);
    };
  }, [queryClient]);
}
