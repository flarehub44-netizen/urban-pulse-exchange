import { useQuery } from "@tanstack/react-query";
import { useBets } from "@/hooks/use-bets";
import { supabase } from "@/integrations/supabase/client";

export function useNavBadges() {
  const { data: bets } = useBets();
  const openPositions = (bets ?? []).filter((b) => b.marketStatus !== "resolved").length;

  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", false);
      if (error) return 0;
      return count ?? 0;
    },
    staleTime: 20_000,
  });

  return { openPositions, unreadNotifications };
}
