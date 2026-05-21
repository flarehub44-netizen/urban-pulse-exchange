import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminFreezeMarket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      marketId,
      frozen,
      note,
    }: {
      marketId: string;
      frozen: boolean;
      note?: string;
    }) => {
      const { data, error } = await supabase.rpc("admin_set_market_frozen", {
        p_market_id: marketId,
        p_frozen: frozen,
        p_note: note ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });
}
