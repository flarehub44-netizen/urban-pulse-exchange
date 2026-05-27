import { createFileRoute } from "@tanstack/react-router";
import { usePartnerLeaderboard, usePartnerOverview } from "@/hooks/use-partner";
import { DivisionBadge } from "@/components/viax/division-badge";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import type { Division } from "@/store/viax-store";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partner/leaderboard")({
  component: PartnerLeaderboardPage,
});

function PartnerLeaderboardPage() {
  const { data: rows } = usePartnerLeaderboard();
  const { data: overview } = usePartnerOverview();
  const myIndex = (rows ?? []).findIndex((r) => r.slug === overview?.slug);
  const top3 = (rows ?? []).slice(0, 3);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.leaderboard}</h1>
      <p className="text-xs text-muted-foreground">
        Bronze → Elite Partner · benefícios: comissão maior, badge verificado, acesso antecipado.
      </p>
      {myIndex >= 0 && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
          <p className="text-xs text-muted-foreground">Sua posição atual</p>
          <p className="mt-1 text-sm font-medium">#{myIndex + 1}</p>
        </div>
      )}
      {top3.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {top3.map((r, i) => (
            <div
              key={r.partner_id}
              className={cn(
                "rounded-xl border p-3",
                i === 0
                  ? "border-warn/40 bg-warn/10"
                  : i === 1
                    ? "border-primary/30 bg-primary/8"
                    : "border-border bg-card/50",
              )}
            >
              <p className="text-xs text-muted-foreground">#{i + 1}</p>
              <p className="mt-1 truncate text-sm font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">@{r.handle}</p>
              <div className="mt-2 flex items-center justify-between">
                <DivisionBadge division={r.tier as Division} />
                <span className="mono text-sm font-semibold">{formatBRL(r.score)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {(rows ?? []).map((r, i) => (
          <div
            key={r.partner_id}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card/60 px-4 py-3",
              overview?.slug === r.slug && "border-primary/40 bg-primary/8",
            )}
          >
            <span className="mono text-sm text-muted-foreground w-6">#{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{r.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                @{r.handle}
              </div>
            </div>
            <DivisionBadge division={r.tier as Division} />
            <span className="mono text-sm font-medium">{formatBRL(r.score)}</span>
          </div>
        ))}
        {(rows ?? []).length === 0 && (
          <div className="rounded-xl border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            <Trophy className="mx-auto mb-2 size-5 opacity-70" />
            Ranking indisponível no momento.
          </div>
        )}
      </div>
    </div>
  );
}
