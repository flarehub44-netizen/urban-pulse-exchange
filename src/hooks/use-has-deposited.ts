import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";

export function useHasDeposited(userId?: string | null) {
  return useQuery({
    queryKey: ["has-deposited", userId],
    queryFn: async () => {
      const { data, error } = await db.rpc("user_has_deposited");
      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
