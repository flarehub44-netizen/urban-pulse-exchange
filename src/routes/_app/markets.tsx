import { createFileRoute, Outlet } from "@tanstack/react-router";
import type { MarketCategoryFilter } from "@/lib/markets-catalog";

export type MarketsSearch = {
  view?: "urban" | "community";
  region?: string;
  status?: "all" | "live" | "closing" | "dispute" | "resolved" | "draft";
  category?: MarketCategoryFilter;
  favorites?: "1";
  hasPosition?: "1";
  sort?: "edge" | "closing" | "trend";
  q?: string;
  aiPicks?: "1";
};

export const Route = createFileRoute("/_app/markets")({
  component: MarketsLayout,
});

function MarketsLayout() {
  return <Outlet />;
}
