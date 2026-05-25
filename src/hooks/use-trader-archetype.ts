import { useQuery } from "@tanstack/react-query";
import { getTraderArchetypeFn } from "@/actions/retention";
import { useAuth } from "@/hooks/use-auth";

export function useTraderArchetype() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["trader-archetype", userId],
    queryFn: () => getTraderArchetypeFn(),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}
