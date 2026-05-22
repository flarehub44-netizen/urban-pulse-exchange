import { createFileRoute } from "@tanstack/react-router";
import { usePartnerLeaderboard } from "@/hooks/use-partner";
import { DivisionBadge } from "@/components/viax/division-badge";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import type { Division } from "@/store/viax-store";

export const Route = createFileRoute("/partner/leaderboard")({
  component: PartnerLeaderboardPage,
});

function PartnerLeaderboardPage() {
  const { data: rows } = usePartnerLeaderboard();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.leaderboard}</h1>
      <p className="text-xs text-muted-foreground">
        Bronze → Elite Partner · benefícios: comissão maior, badge verificado, acesso antecipado.
      </p>
      <div className="space-y-2">
        {(rows ?? []).map((r, i) => (
          <div
            key={r.partner_id}
            className="flex items-center gap-3 rounded-xl border bg-card/60 px-4 py-3"
          >
            <span className="mono text-sm text-muted-foreground w-6">#{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{r.name}</div>
              <div className="text-xs text-muted-foreground">
                @{r.handle} · @{r.slug}
              </div>
            </div>
            <DivisionBadge division={r.tier as Division} />
            <span className="mono text-sm font-medium">{formatBRL(r.score)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
