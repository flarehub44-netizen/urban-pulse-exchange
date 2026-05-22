import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  useAdminSettlementQueue,
  useAdminReprocess,
} from "@/hooks/use-admin-dashboard";
import { useAdminResolveMarket } from "@/hooks/use-admin-resolve";
import { PoolBreakdown } from "@/components/admin/pool-breakdown";
import { copy } from "@/copy/pt-BR";
import { InlineError } from "@/components/viax/inline-error";
import type { Side } from "@/store/viax-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settlement")({
  component: AdminSettlementPage,
});

function AdminSettlementPage() {
  const { data: queue, isError, refetch } = useAdminSettlementQueue();
  const { mutateAsync: reprocess } = useAdminReprocess();
  const { mutateAsync: resolve, isPending } = useAdminResolveMarket();

  if (isError) return <InlineError onRetry={() => refetch()} />;

  const onReprocess = async (id: string) => {
    try {
      await reprocess(id);
      toast.success("Snapshots reprocessados.");
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onResolve = async (id: string, side: Side) => {
    try {
      await resolve({ marketId: id, side, note: "admin_settlement" });
      toast.success(copy.settings.adminResolved);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : copy.settings.adminResolveError);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.settlement.title}</h1>
        <p className="text-xs text-muted-foreground">Settlement Engine · liquidação e disputas</p>
      </div>

      <div className="space-y-4">
        {(queue ?? []).map((m) => (
          <div key={m.id} className="rounded-xl border bg-card/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{m.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.region} · {m.status} · snapshots: {m.snapshot_count}
                  {m.ai_side && ` · IA: ${m.ai_side}`}
                </p>
                <Link
                  to="/markets/$marketId"
                  params={{ marketId: m.id }}
                  search={{ tab: "audit" }}
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                >
                  Auditoria
                </Link>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] uppercase",
                  m.status === "dispute" ? "bg-warn/15 text-warn" : "bg-muted text-muted-foreground",
                )}
              >
                {m.status}
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <PoolBreakdown poolYes={Number(m.pool_yes)} poolNo={Number(m.pool_no)} />
              <div className="flex flex-col gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => onReprocess(m.id)}
                  className="rounded-lg border px-3 py-2 text-xs hover:bg-surface-2"
                >
                  {copy.admin.settlement.reprocess}
                </button>
                {m.status === "dispute" && (
                  <div className="flex gap-2">
                    {(["YES", "NO"] as const).map((side) => (
                      <button
                        key={side}
                        type="button"
                        disabled={isPending}
                        onClick={() => onResolve(m.id, side)}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50",
                          side === "YES"
                            ? "border-up/50 bg-up/10 text-up"
                            : "border-down/50 bg-down/10 text-down",
                        )}
                      >
                        {copy.admin.settlement.execute} {side === "YES" ? "SIM" : "NÃO"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {!queue?.length && (
          <p className="text-sm text-muted-foreground">Nenhum mercado na fila de liquidação.</p>
        )}
      </div>
    </div>
  );
}
