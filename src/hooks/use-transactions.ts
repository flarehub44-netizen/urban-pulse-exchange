import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Transaction } from "@/store/viax-store";

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    type: row.type as Transaction["type"],
    market: (row.market_label as string) ?? undefined,
    amount: Number(row.amount),
    time: new Date(row.created_at as string).getTime(),
  };
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)) as { data: Record<string, unknown>[] | null; error: Error | null };
      if (error) throw error;
      return (data ?? []).map(mapTransaction);
    },
    staleTime: 10_000,
  });
}
