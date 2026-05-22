import { useQuery } from "@tanstack/react-query";
import { getActiveEventsFn } from "@/actions/events";

export function useActiveEvents() {
  return useQuery({
    queryKey: ["active-events"],
    queryFn: () => getActiveEventsFn(),
    staleTime: 5 * 60_000,
  });
}
