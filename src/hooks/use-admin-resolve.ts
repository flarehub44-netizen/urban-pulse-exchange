import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Side } from "@/lib/parimutuel";
import { invalidateAllUserQueries } from "@/lib/query-invalidation";

export function useAdminResolveMarket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      marketId,
      side,
      note,
    }: {
      marketId: string;
      side: Side;
      note?: string;
    }) => {
      const { data, error } = await supabase.rpc("admin_resolve_market", {
        p_market_id: marketId,
        p_winning_side: side,
        p_note: note ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      invalidateAllUserQueries(queryClient);
    },
  });
}
