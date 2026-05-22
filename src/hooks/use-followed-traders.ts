import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/loose";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { toggleTraderFollowFn } from "@/actions/follows";

const STORAGE_KEY = "viax_followed_traders";
const QUERY_KEY = "followed-traders";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function fetchFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_following_trader_ids");
  if (error) throw error;
  return ((data as string[]) ?? []).filter(Boolean);
}

export function useFollowedTraders() {
  const { userId } = useAnonAuth();
  const qc = useQueryClient();
  const migratedRef = useRef(false);

  const { data: ids = [] } = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: () => (userId ? fetchFollowingIds(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId || migratedRef.current) return;
    const local = readLocal();
    if (!local.length) return;
    migratedRef.current = true;
    (async () => {
      for (const followingId of local) {
        if (followingId === userId) continue;
        await supabase
          .from("trader_follows")
          .upsert(
            { follower_id: userId, following_id: followingId },
            { onConflict: "follower_id,following_id", ignoreDuplicates: true },
          );
      }
      localStorage.removeItem(STORAGE_KEY);
      qc.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    })();
  }, [userId, qc]);

  const mutation = useMutation({
    mutationFn: async (followingId: string) => {
      const res = await toggleTraderFollowFn({ data: { followingId } });
      return { followingId, following: res.following };
    },
    onMutate: async (followingId) => {
      await qc.cancelQueries({ queryKey: [QUERY_KEY, userId] });
      const prev = qc.getQueryData<string[]>([QUERY_KEY, userId]) ?? [];
      const next = prev.includes(followingId)
        ? prev.filter((id) => id !== followingId)
        : [...prev, followingId];
      qc.setQueryData([QUERY_KEY, userId], next);
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData([QUERY_KEY, userId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [QUERY_KEY, userId] }),
  });

  const follow = useCallback(
    (traderId: string) => {
      if (!ids.includes(traderId)) mutation.mutate(traderId);
    },
    [ids, mutation],
  );

  const unfollow = useCallback(
    (traderId: string) => {
      if (ids.includes(traderId)) mutation.mutate(traderId);
    },
    [ids, mutation],
  );

  const toggle = useCallback(
    (traderId: string) => {
      mutation.mutate(traderId);
    },
    [mutation],
  );

  const isFollowing = useCallback((traderId: string) => ids.includes(traderId), [ids]);

  return { ids, follow, unfollow, toggle, isFollowing, isPending: mutation.isPending };
}
