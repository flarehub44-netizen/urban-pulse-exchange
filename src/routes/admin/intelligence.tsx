import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminOracleHealth, useAdminTriggerLifecycle } from "@/hooks/use-admin-dashboard";
import { toast } from "sonner";
import { AdminOpsPanel } from "@/components/viax/admin-ops-panel";
import { copy } from "@/copy/pt-BR";
import { InlineError } from "@/components/viax/inline-error";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/intelligence")({
  component: AdminIntelligencePage,
});

const MODEL_CARDS = [
  { name: "YOLO detector", status: "simulado", version: "v8-nano" },
  { name: "Tracking engine", status: "ativo", version: "bytetrack-1.2" },
  { name: "Previsão urbana", status: "ativo", version: "XGBoost-regions" },
  { name: "Fallback", status: "standby", version: "regions-median" },
];

function AdminIntelligencePage() {
  const { data, isError, refetch } = useAdminOracleHealth();
  const { mutateAsync: triggerLifecycle, isPending: ticking } = useAdminTriggerLifecycle();
  const [yoloRunning, setYoloRunning] = useState(false);

  if (isError) return <InlineError onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.nav.intelligence}</h1>
        <p className="text-xs text-muted-foreground">
          Oráculo UrbanMind · taxa disputa: {(Number(data?.dispute_rate ?? 0) * 100).toFixed(1)}%
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdminOpsPanel />
        <button
          type="button"
          disabled={ticking}
          onClick={async () => {
            try {
              await triggerLifecycle();
              toast.success("Motor de lifecycle executado.");
              refetch();
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "Erro");
            }
          }}
          className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs text-primary disabled:opacity-50"
        >
          {ticking ? "Executando…" : "Executar tick agora"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MODEL_CARDS.map((m) => (
          <div key={m.name} className="rounded-xl border bg-card/60 p-3 text-xs">
            <p className="font-medium">{m.name}</p>
            <p className="mt-1 text-muted-foreground">{m.version}</p>
            <p className="mt-1 text-up">{m.status}</p>
            {m.name === "YOLO detector" && (
              <button
                type="button"
                disabled={yoloRunning}
                onClick={async () => {
                  setYoloRunning(true);
                  await new Promise((r) => setTimeout(r, 900));
                  setYoloRunning(false);
                  toast.success(copy.admin.intelligence.yoloDemoDone, {
                    description: copy.admin.intelligence.yoloNote,
                  });
                }}
                className="mt-2 w-full rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary disabled:opacity-50"
              >
                {yoloRunning ? "Inferindo…" : copy.admin.intelligence.yoloDemo}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card/60 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Regiões (fonte sintética)
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Região</th>
                <th className="py-2 text-right">Fluxo</th>
                <th className="py-2 text-right">Vel.</th>
                <th className="py-2 text-right">Cong.</th>
                <th className="py-2 text-right">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {(data?.regions ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 text-right mono">{r.flow}</td>
                  <td className="py-2 text-right mono">{Number(r.avg_speed).toFixed(0)}</td>
                  <td className="py-2 text-right mono">
                    {(Number(r.congestion) * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 text-right text-muted-foreground">
                    {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true, locale: ptBR })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border bg-card/60 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Snapshots recentes
        </h2>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs">
          {(data?.recent_snapshots ?? []).map((s, i) => (
            <li key={i} className="flex justify-between gap-2 rounded border px-3 py-2">
              <span className="truncate text-muted-foreground">{s.market_id}</span>
              <span className="mono shrink-0">
                {s.metric}={Number(s.raw_value).toFixed(0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
