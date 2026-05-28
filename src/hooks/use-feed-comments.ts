import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Division } from "@/store/viax-store";

export interface FeedComment {
  id: string;
  text: string;
  time: number;
  user: {
    name: string;
    handle: string;
    avatar: string;
    division: Division;
  };
}

function mapComment(row: Record<string, unknown>): FeedComment {
  const profile = (row.profile_public ?? row.profiles) as Record<string, unknown> | null;
  return {
    id: row.id as string,
    text: row.text as string,
    time: new Date(row.created_at as string).getTime(),
    user: {
      name: (profile?.name ?? "Trader") as string,
      handle: (profile?.handle ?? "") as string,
      avatar: (profile?.avatar ?? "") as string,
      division: (profile?.division ?? "Bronze") as Division,
    },
  };
}

export function useFeedComments(postId: string | null) {
  return useQuery({
    queryKey: ["feed-comments", postId],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("feed_comments")
        .select("id, text, created_at, profile_public(name, handle, avatar, division)")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true })
        .limit(50)) as { data: Record<string, unknown>[] | null; error: Error | null };
      if (error) throw error;
      return (data ?? []).map(mapComment);
    },
    enabled: !!postId && !postId.startsWith("seed-"),
    staleTime: 10_000,
  });
}
