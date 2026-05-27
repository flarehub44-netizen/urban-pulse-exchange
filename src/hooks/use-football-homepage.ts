import { useQuery } from "@tanstack/react-query";
import { getFootballHomepageFn } from "@/actions/football-home";

export function formatYmd(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useFootballHomepage(date: string) {
  return useQuery({
    queryKey: ["football-homepage", date],
    queryFn: () => getFootballHomepageFn({ data: { date } }),
    staleTime: 30_000,
  });
}
