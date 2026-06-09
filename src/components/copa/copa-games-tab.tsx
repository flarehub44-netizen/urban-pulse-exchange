import { useUnifiedCatalog } from "@/hooks/use-catalog-markets";
import { FootballMatchRow } from "@/components/football/football-match-row";
import { InlineError } from "@/components/viax/inline-error";
import { EmptyState } from "@/components/viax/empty-state";

export function CopaGamesTab() {
  const { data, isLoading, error, refetch } = useUnifiedCatalog({
    vertical: "copa",
    topic: "copa-2026",
    status: "live",
    sort: "closing",
    limit: 50,
  });

  const football = data?.filter((m) => m.type === "football_1x3") ?? [];

  if (error) {
    return <InlineError message={error.message} onRetry={() => void refetch()} />;
  }

  if (!isLoading && football.length === 0) {
    return (
      <EmptyState
        title="Nenhum jogo publicado ainda"
        description="Os mercados de jogos aparecem após sync e publicação no admin de futebol."
      />
    );
  }

  return (
    <div className="divide-y divide-border/40 rounded-xl border border-border/60 px-4">
      {football.map((m) => (
        <FootballMatchRow key={m.id} market={m} />
      ))}
    </div>
  );
}
