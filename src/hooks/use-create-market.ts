import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Market } from "@/store/viax-store";

export type CreateMarketInput = {
  id: string;
  question: string;
  region: string;
  target: number;
  category: Market["category"];
  endsAt: Date;
  regionId: string;
  dataSource?: "regions" | "manual" | "camera";
};

export function useCreateMarket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMarketInput) => {
      const { data, error } = await supabase.rpc("create_market", {
        p_id: input.id,
        p_question: input.question,
        p_region: input.region,
        p_target: input.target,
        p_category: input.category,
        p_ends_at: input.endsAt.toISOString(),
        p_region_id: input.regionId,
        p_data_source: input.dataSource ?? "regions",
      });
      if (error) throw error;
      return data as { market_id: string; status: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });
}
