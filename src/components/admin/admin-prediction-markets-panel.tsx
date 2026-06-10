import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  useAdminPredictionMarkets,
  useAdminResolveOutcomeMarket,
  useAdminUpdatePredictionMarket,
  useAdminVoidPredictionMarket,
} from "@/hooks/admin/use-admin-prediction-markets";

export function AdminPredictionMarketsPanel() {
  const { data: markets, isLoading } = useAdminPredictionMarkets();
  const { mutateAsync: resolve, isPending } = useAdminResolveOutcomeMarket();
  const { mutateAsync: voidMarket, isPending: voiding } = useAdminVoidPredictionMarket();
  const { mutateAsync: updateMarket, isPending: updating } = useAdminUpdatePredictionMarket();
  const [winnerByMarket, setWinnerByMarket] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");

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

  const onVoid = async (marketId: string) => {
    if (!window.confirm("Anular mercado e reembolsar apostas?")) return;
    try {
      await voidMarket({ data: { marketId, reason: "admin_moderation" } });
      toast.success("Mercado anulado");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao anular");
    }
  };

  const openEdit = (marketId: string, question: string, endsAt: string) => {
    setEditId(marketId);
    setEditQuestion(question);
    setEditEndsAt(endsAt.slice(0, 16));
  };

  const onSaveEdit = async () => {
    if (!editId) return;
    try {
      await updateMarket({
        data: {
          marketId: editId,
          question: editQuestion,
          endsAt: new Date(editEndsAt).toISOString(),
        },
      });
      toast.success("Mercado atualizado");
      setEditId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao editar");
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
    <div className="space-y-4">
      {editId && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium">Editar mercado</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              Pergunta
              <input
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs">
              Encerra em
              <input
                type="datetime-local"
                value={editEndsAt}
                onChange={(e) => setEditEndsAt(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={updating}
              onClick={() => void onSaveEdit()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditId(null)}
              className="rounded-lg border px-3 py-1.5 text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Mercado</th>
              <th className="px-3 py-2">Vertical</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
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
                    <div className="flex flex-col gap-2">
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
                          onClick={() => void onResolve(m.id)}
                          className="rounded-lg border border-primary/40 px-2 py-1 text-xs text-primary hover:bg-primary/10"
                        >
                          Resolver
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(m.id, m.question, m.ends_at)}
                          className="rounded-lg border px-2 py-1 text-xs hover:bg-muted"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={voiding}
                          onClick={() => void onVoid(m.id)}
                          className="rounded-lg border border-down/40 px-2 py-1 text-xs text-down hover:bg-down/10"
                        >
                          Anular
                        </button>
                      </div>
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
    </div>
  );
}
