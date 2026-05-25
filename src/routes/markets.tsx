import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { MarketCategoryFilter } from "@/lib/markets-catalog";
import type { AuthModalSearch } from "@/lib/auth-modal-search";
import { AuthAwareShell } from "@/components/viax/auth-aware-shell";

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
} & AuthModalSearch;

export const Route = createFileRoute("/markets")({
  beforeLoad: async () => {
    await supabase.auth.getSession();
  },
  component: MarketsLayout,
});

function MarketsLayout() {
  return (
    <AuthAwareShell>
      <Outlet />
    </AuthAwareShell>
  );
}
