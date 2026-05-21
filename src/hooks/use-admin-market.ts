import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOpenMarket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (marketId: string) => {
      const { data, error } = await supabase.rpc("open_market", {
        p_market_id: marketId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });
}
