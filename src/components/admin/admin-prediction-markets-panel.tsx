import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  useAdminPredictionMarkets,
  useAdminResolveOutcomeMarket,
} from "@/hooks/admin/use-admin-prediction-markets";

export function AdminPredictionMarketsPanel() {
  const { data: markets, isLoading } = useAdminPredictionMarkets();
  const { mutateAsync: resolve, isPending } = useAdminResolveOutcomeMarket();
  const [winnerByMarket, setWinnerByMarket] = useState<Record<string, string>>({});

  const onResolve = async (marketId: string) => {
    const winningOutcomeId = winnerByMarket[marketId];
    if (!winningOutcomeId) {
      toast.error("Selecione o outcome vencedor");
      return;
    }
    try {
      await resolve({ data: { marketId, winningOutcomeId } });
      toast.success("Mercado resolvido");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao resolver");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando mercados multi-outcome…</p>;
  }

  if (!markets?.length) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum mercado multi-outcome cadastrado.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Mercado</th>
            <th className="px-3 py-2">Vertical</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Resolver</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => (
            <tr key={m.id} className="border-b border-border/50">
              <td className="px-3 py-2">
                <Link
                  to="/pm/$marketId"
                  params={{ marketId: m.id }}
                  className="font-medium hover:text-primary"
                >
                  {m.question}
                </Link>
                <p className="text-xs text-muted-foreground">{m.id}</p>
              </td>
              <td className="px-3 py-2 capitalize">{m.vertical}</td>
              <td className="px-3 py-2">{m.status}</td>
              <td className="px-3 py-2">
                {m.status === "live" || m.status === "closing" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={winnerByMarket[m.id] ?? ""}
                      onChange={(e) =>
                        setWinnerByMarket((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      className="rounded-lg border bg-surface px-2 py-1 text-xs"
                    >
                      <option value="">Vencedor…</option>
                      {(m.market_outcomes ?? []).map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label} (pool {Number(o.pool).toFixed(0)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onResolve(m.id)}
                      className="rounded-lg border border-primary/40 px-2 py-1 text-xs text-primary hover:bg-primary/10"
                    >
                      Resolver
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
