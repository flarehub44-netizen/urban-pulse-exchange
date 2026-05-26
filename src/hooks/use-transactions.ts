import { useQuery } from "@tanstack/react-query";
import type { Transaction } from "@/store/viax-store";
import { getWalletOverviewFn } from "@/actions/account";

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const data = await getWalletOverviewFn({ data: { limit: 100 } });
      return data.transactions as Transaction[];
    },
    staleTime: 10_000,
  });
}
