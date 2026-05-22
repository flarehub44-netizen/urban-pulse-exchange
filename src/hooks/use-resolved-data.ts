import { useViaX } from "@/store/viax-store";
import type { Market, Trader, Transaction, ViaXNotification, FeedPost } from "@/store/viax-store";
import { pickDbOrEmptyArray, pickDbOrSeed } from "@/lib/data-source";
import { useProfile } from "@/hooks/use-profile";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useMarketsList } from "@/hooks/use-markets";
import { useRegions } from "@/hooks/use-regions";
import { useTransactions } from "@/hooks/use-transactions";
import { useTraders } from "@/hooks/use-traders";
import { useNotifications } from "@/hooks/use-notifications";
import { useFeed } from "@/hooks/use-feed";

export function useResolvedProfile() {
  const { userId } = useAnonAuth();
  const { data: profile, isLoading, isError } = useProfile(userId);
  const seed = useViaX((s) => s.me);
  const me = pickDbOrSeed(profile, seed);
  return { me, profile, isLoading, isError };
}

export function useResolvedMarkets() {
  const { markets, isLoading, isError, error } = useMarketsList();
  return { markets, isLoading, isError, error };
}

export function useResolvedRegions() {
  const { data: db, isLoading, isError } = useRegions();
  const seed = useViaX((s) => s.regions);
  const regions = pickDbOrEmptyArray(db, seed);
  return { regions, isLoading, isError };
}

export function useResolvedTransactions() {
  const { data: db, isLoading, isError } = useTransactions();
  const seed = useViaX((s) => s.transactions);
  const transactions = pickDbOrEmptyArray(db, seed);
  return { transactions, isLoading, isError };
}

export function useResolvedTraders() {
  const { data: db, isLoading, isError } = useTraders();
  const seed = useViaX((s) => s.traders);
  const traders = pickDbOrEmptyArray(db, seed) as Trader[];
  return { traders, isLoading, isError };
}

export function useResolvedNotifications() {
  const { data: db, isLoading, isError } = useNotifications();
  const seed = useViaX((s) => s.notifications);
  const notifications = pickDbOrEmptyArray(db, seed) as ViaXNotification[];
  return { notifications, isLoading, isError };
}

export function useResolvedFeed() {
  const { data: db, isLoading, isError } = useFeed();
  const seed = useViaX((s) => s.feed);
  const feed = pickDbOrEmptyArray(db, seed) as FeedPost[];
  return { feed, isLoading, isError };
}

export function useResolvedFeedForMarket(marketId: string) {
  const { data: db, isLoading, isError } = useFeed(marketId);
  const seed = useViaX((s) => s.feed.filter((p) => p.marketId === marketId));
  const feed = pickDbOrEmptyArray(db, seed) as FeedPost[];
  return { feed, isLoading, isError };
}

export type { Market, Trader, Transaction };
