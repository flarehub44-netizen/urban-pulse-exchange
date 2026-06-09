import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Side } from "@/lib/parimutuel";
import { adminResolveMarketFn } from "@/actions/admin/settlement";
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
    }) =>
      adminResolveMarketFn({
        data: { marketId, winningSide: side, note },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      invalidateAllUserQueries(queryClient);
    },
  });
}
