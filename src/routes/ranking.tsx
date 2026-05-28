import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthAwareShell } from "@/components/viax/auth-aware-shell";
import { RankingPage } from "@/components/viax/ranking-page";
import type { AuthModalSearch } from "@/lib/auth-modal-search";
import { parseAuthModalSearch } from "@/lib/auth-modal-search";

export type RankingSearch = {
  tab?: "global" | "cidade" | "bairro" | "amigos" | "impacto";
} & AuthModalSearch;

export const Route = createFileRoute("/ranking")({
  beforeLoad: async () => {
    await supabase.auth.getSession();
  },
  head: () => ({
    meta: [
      { title: "Ranking · ViaX" },
      { name: "description", content: "Leaderboards globais, por cidade, bairro e amigos." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): RankingSearch => {
    const t = search.tab;
    const tab =
      t === "cidade" || t === "bairro" || t === "amigos" || t === "impacto"
        ? t
        : ("global" as const);
    return { tab, ...parseAuthModalSearch(search) };
  },
  component: RankingRoute,
});

function RankingRoute() {
  return (
    <AuthAwareShell>
      <RankingPage />
    </AuthAwareShell>
  );
}
