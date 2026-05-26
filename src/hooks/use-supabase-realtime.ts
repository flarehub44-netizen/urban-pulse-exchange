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
    // Channel 1 — market pool updates (real bets from any session)
    const marketsCh = supabase
      .channel("markets-pool")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "markets" },
        (payload) => {
          const updated = mapMarket(payload.new as Record<string, unknown>);

          // Update TanStack Query cache
          queryClient.setQueryData<Market[]>(
            ["markets"],
            (old) =>
              old?.map((m) =>
                m.id === updated.id
                  ? { ...m, pool: updated.pool, participants: updated.participants }
                  : m,
              ) ?? old,
          );
        },
      )
      .subscribe();

    // Channel 2 — new feed posts
    const feedCh = supabase
      .channel("feed-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_posts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["feed"] });
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
        .channel(`notifications:${userId}`)
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
            toast(notif.text);
          },
        )
        .subscribe();
    };

    setupNotifChannel();

    return () => {
      supabase.removeChannel(marketsCh);
      supabase.removeChannel(feedCh);
      if (notifCh) supabase.removeChannel(notifCh);
    };
  }, [queryClient]);
}
