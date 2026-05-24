import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { createFeedPostFn } from "@/actions/feed";
import { useQueryClient } from "@tanstack/react-query";

export function useWinToast() {
  const { userId } = useAnonAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const ch = supabase
      .channel(`win-toast-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.kind !== "win") return;

          const text = row.text as string;
          const marketId = (row.market_id as string | null) ?? undefined;

          qc.invalidateQueries({ queryKey: ["notifications"] });

          toast.success(text, {
            duration: 8000,
            action: {
              label: "Compartilhar no Feed",
              onClick: () => {
                const postText = `${text} 🎯`;
                createFeedPostFn({
                  data: {
                    text: postText.slice(0, 280),
                    marketId,
                    tag: "Previsão",
                  },
                })
                  .then(() => {
                    qc.invalidateQueries({ queryKey: ["feed"] });
                    toast.success("Post publicado no feed!");
                  })
                  .catch((e: unknown) => {
                    console.error("[WinToast] share failed", e);
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
