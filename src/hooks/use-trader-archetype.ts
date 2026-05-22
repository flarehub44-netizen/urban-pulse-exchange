import { useQuery } from "@tanstack/react-query";
import { getTraderArchetypeFn } from "@/actions/retention";
import { useAnonAuth } from "@/hooks/use-anon-auth";

export function useTraderArchetype() {
  const { userId } = useAnonAuth();
  return useQuery({
    queryKey: ["trader-archetype", userId],
    queryFn: () => getTraderArchetypeFn(),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}
