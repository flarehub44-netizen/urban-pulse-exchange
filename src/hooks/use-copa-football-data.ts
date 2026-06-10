import { useQuery } from "@tanstack/react-query";
import { getCopaKnockoutFn, getCopaStandingsFn } from "@/actions/copa-football-data";

export function useCopaStandings() {
  return useQuery({
    queryKey: ["copa-standings"],
    queryFn: () => getCopaStandingsFn({ data: { leagueId: 1, season: 2026 } }),
    staleTime: 15 * 60 * 1000,
  });
}

export function useCopaKnockout() {
  return useQuery({
    queryKey: ["copa-knockout"],
    queryFn: () => getCopaKnockoutFn({ data: { leagueId: 1, season: 2026 } }),
    staleTime: 15 * 60 * 1000,
  });
}
