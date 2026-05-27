import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { createFeedPostFn } from "@/actions/feed";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEngagementQueries } from "@/lib/query-invalidation";
import { shareWin } from "@/lib/share";

export function useWinToast() {
  const { userId } = useAuth();
  const { data: profile } = useProfile(userId);
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const ch = supabase
      .channel(`win-toast-${userId}`, { config: { private: true } })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          type NotificationRow = { kind: string; text: string; market_id: string | null };
          const row = payload.new as NotificationRow;
          if (row.kind !== "win") return;

          const text = row.text;
          const marketId = row.market_id ?? undefined;

          invalidateEngagementQueries(qc);

          const origin =
            typeof window !== "undefined" ? window.location.origin : "https://viax.com.br";
          const handle = profile?.handle ?? "";
          const shareUrl = handle ? `${origin}/r/${handle}` : origin;
          const shareText = `${text} 🎯 Entre no ViaX:`;

          toast.success(text, {
            duration: 8000,
            action: {
              label: "📤 Compartilhar",
              onClick: () => {
                void shareWin({ text: shareText, url: shareUrl }).then((result) => {
                  if (result === "copied") toast.success("Link copiado!");
                  const postText = `${text} 🎯`;
                  createFeedPostFn({
                    data: { text: postText.slice(0, 280), marketId, tag: "Previsão" },
                  })
                    .then(() => invalidateEngagementQueries(qc))
                    .catch((e: unknown) => console.error("[WinToast] feed post failed", e));
                });
              },
            },
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId, qc]);
}
