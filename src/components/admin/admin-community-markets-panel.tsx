import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAdminCommunityMarkets, useAdminCommunityReports } from "@/hooks/use-admin-community";
import { useVoidCommunityMarket } from "@/hooks/use-community-markets";
import { formatBRL } from "@/lib/parimutuel";
import { copy } from "@/copy/pt-BR";
import { InlineError } from "@/components/viax/inline-error";

export function AdminCommunityMarketsPanel() {
  const { data: markets = [], isError, refetch } = useAdminCommunityMarkets();
  const { data: reports = [] } = useAdminCommunityReports();
  const { mutateAsync: voidMarket } = useVoidCommunityMarket();

  if (isError) return <InlineError onRetry={() => refetch()} />;

  const onVoid = async (marketId: string) => {
    if (!window.confirm(copy.community.voidConfirm)) return;
    try {
      await voidMarket({ marketId, reason: "admin_moderation" });
      toast.success(copy.community.voidSuccess);
      void refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : copy.errors.generic);
    }
  };

  return (
    <div className="space-y-6">
      {reports.length > 0 && (
        <div className="rounded-xl border border-warn/30 bg-warn/5 p-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-warn">
            {copy.community.adminReportsTitle}
          </h2>
          <ul className="space-y-2 text-xs">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg border bg-surface/60 p-2">
                <Link
                  to="/markets/$marketId"
                  params={{ marketId: r.market_id }}
                  className="font-medium text-primary hover:underline"
                >
                  {r.question}
                </Link>
                <p className="mt-1 text-muted-foreground">
                  {r.reporter_username}: {r.reason}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="border-b bg-surface/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Pergunta</th>
              <th className="px-3 py-2 text-left">Criador</th>
              <th className="px-3 py-2 text-left">Vis.</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Volume</th>
              <th className="px-3 py-2 text-left">Denúncias</th>
              <th className="px-3 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => (
              <tr key={m.id} className="border-b border-border/40">
                <td className="max-w-[200px] truncate px-3 py-2 font-medium">{m.question}</td>
                <td className="px-3 py-2">{m.creator_username ?? "—"}</td>
                <td className="px-3 py-2">{m.visibility}</td>
                <td className="px-3 py-2">{m.status}</td>
                <td className="px-3 py-2 text-right mono">{formatBRL(Number(m.volume))}</td>
                <td className="px-3 py-2">{m.pending_reports ?? 0}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Link
                      to="/markets/$marketId"
                      params={{ marketId: m.id }}
                      className="rounded border px-2 py-0.5 hover:bg-surface"
                    >
                      Ver
                    </Link>
                    {m.status !== "settled" && m.status !== "void" && (
                      <button
                        type="button"
                        onClick={() => void onVoid(m.id)}
                        className="rounded border border-down/40 px-2 py-0.5 text-down"
                      >
                        {copy.community.adminVoidCommunity}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {markets.length === 0 && (
          <p className="p-4 text-center text-xs text-muted-foreground">
            Nenhum mercado da comunidade.
          </p>
        )}
      </div>
    </div>
  );
}
