import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRegions } from "@/hooks/use-regions";
import { copy } from "@/copy/pt-BR";
import { probability, prizePool, formatBRL, PRIZE_RATIO } from "@/lib/parimutuel";
import { pickDbOrEmptyArray } from "@/lib/data-source";
import { useViaX } from "@/store/viax-store";
import { useAdminApplySimulator } from "@/hooks/use-admin-dashboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/simulator")({
  component: AdminSimulatorPage,
});

function AdminSimulatorPage() {
  const { data: dbRegions } = useRegions();
  const seedRegions = useViaX((s) => s.regions);
  const regions = pickDbOrEmptyArray(dbRegions, seedRegions);

  const [rush, setRush] = useState(false);
  const [rain, setRain] = useState(false);
  const [hypoYes, setHypoYes] = useState(5000);
  const [hypoNo, setHypoNo] = useState(3000);
  const [stake, setStake] = useState(100);
  const { mutateAsync: applyScenario, isPending: applying } = useAdminApplySimulator();

  const simFlow = useMemo(() => {
    const base = rush ? 5200 : 2200;
    const rainFactor = rain ? 0.82 : 1;
    return Math.round(base * rainFactor);
  }, [rush, rain]);

  const pool = { YES: hypoYes, NO: hypoNo };
  const pYes = probability(pool, "YES");
  const total = prizePool(pool);
  const prize = total * PRIZE_RATIO;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.simulator.title}</h1>
        <p className="text-xs text-muted-foreground">{copy.admin.simulator.applyNote}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={applying}
          onClick={async () => {
            try {
              await applyScenario({ rush, rain });
              toast.success("Cenário aplicado nas regiões (DB).");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "Erro");
            }
          }}
        >
          {applying ? "Aplicando…" : "Aplicar cenário no banco"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 rounded-xl border bg-card/60 p-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)} />
          {copy.admin.simulator.rush}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={rain} onChange={(e) => setRain(e.target.checked)} />
          {copy.admin.simulator.rain}
        </label>
      </div>

      <div className="rounded-xl border bg-card/60 p-4">
        <h2 className="text-xs font-medium uppercase text-muted-foreground">
          {copy.admin.simulator.preview}
        </h2>
        <ul className="mt-3 space-y-2 text-xs">
          {regions.map((r) => (
            <li key={r.id} className="flex justify-between rounded border px-3 py-2">
              <span>{r.name}</span>
              <span className="mono text-muted-foreground">
                fluxo sim. ~{simFlow} · cong. {(rush ? 0.78 : 0.28).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-card/60 p-4 space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">Mercado hipotético (parimutuel offline)</p>
        <div className="grid grid-cols-2 gap-2">
          <label>
            Pool SIM
            <input
              type="number"
              value={hypoYes}
              onChange={(e) => setHypoYes(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded border bg-surface px-2 py-1 mono text-xs"
            />
          </label>
          <label>
            Pool NÃO
            <input
              type="number"
              value={hypoNo}
              onChange={(e) => setHypoNo(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded border bg-surface px-2 py-1 mono text-xs"
            />
          </label>
        </div>
        <label>
          Sua aposta (R$)
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded border bg-surface px-2 py-1 mono text-xs"
          />
        </label>
        <div className="rounded-lg border bg-surface/40 p-3 text-xs space-y-1 mono">
          <p>Prêmio total: {formatBRL(total)}</p>
          <p>Para vencedores (90%): {formatBRL(prize)}</p>
          <p>Prob. SIM: {(pYes * 100).toFixed(1)}%</p>
          <p>
            Se SIM ganhar, retorno est. ~{" "}
            {formatBRL(stake > 0 && hypoYes > 0 ? (stake / hypoYes) * prize : 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
