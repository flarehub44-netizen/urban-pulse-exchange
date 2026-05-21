import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/supabase/loose";
import type { FeedPost } from "@/store/viax-store";

function mapPost(row: Record<string, unknown>): FeedPost {
  const profile = row.profiles as Record<string, unknown> | null;
  return {
    id: row.id as string,
    user: {
      id: (profile?.id ?? "") as string,
      name: (profile?.name ?? "Trader") as string,
      handle: (profile?.handle ?? "") as string,
      avatar: (profile?.avatar ?? "") as string,
      division: (profile?.division ?? "Bronze") as FeedPost["user"]["division"],
      accuracy: Number(profile?.accuracy ?? 0.5),
      roi: Number(profile?.roi ?? 0),
      streak: Number(profile?.streak ?? 0),
      volume: Number(profile?.volume_24h ?? 0),
      weeklyGrowth: 0,
      city: (profile?.city ?? "São Paulo") as string,
      neighborhood: (profile?.neighborhood ?? "") as string,
    },
    text: row.text as string,
    time: new Date(row.created_at as string).getTime(),
    marketId: (row.market_id as string) ?? undefined,
    likes: Number(row.likes),
    comments: Number(row.comments),
    reposts: Number(row.reposts),
    tag: (row.tag as FeedPost["tag"]) ?? undefined,
  };
}

export function useFeed(marketId?: string) {
  return useQuery({
    queryKey: ["feed", marketId ?? "all"],
    queryFn: async () => {
      let query = db
        .from("feed_posts")
        .select(
          "*, profiles(id, name, handle, avatar, division, accuracy, roi, streak, volume_24h, city, neighborhood)",
        )
        .order("created_at", { ascending: false })
        .limit(40);
      if (marketId) {
        query = query.eq("market_id", marketId);
      }
      const { data, error } = (await query) as {
        data: Record<string, unknown>[] | null;
        error: Error | null;
      };
      if (error) throw error;
      return (data ?? []).map(mapPost);
    },
    staleTime: 15_000,
  });
}
