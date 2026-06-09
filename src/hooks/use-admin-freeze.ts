import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminSetMarketFrozenFn } from "@/actions/admin/cameras";

export function useAdminFreezeMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ marketId, frozen }: { marketId: string; frozen: boolean }) =>
      adminSetMarketFrozenFn({ data: { marketId, frozen } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["markets"] }),
  });
}
