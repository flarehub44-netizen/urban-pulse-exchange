import { useState } from "react";
import { Bell, BellOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useMarketAlerts,
  useCreateMarketAlert,
  useDeleteMarketAlert,
} from "@/hooks/use-market-alerts";
import { probability, formatPct } from "@/lib/parimutuel";
import { cn } from "@/lib/utils";
import type { Market, Side } from "@/store/viax-store";

interface MarketAlertButtonProps {
  m: Market;
}

const THRESHOLD_PRESETS = [55, 60, 65, 70, 75, 80];

export function MarketAlertButton({ m }: MarketAlertButtonProps) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<Side>("YES");
  const [threshold, setThreshold] = useState(70);

  const { data: alerts = [] } = useMarketAlerts(m.id);
  const { mutateAsync: createAlert, isPending: creating } = useCreateMarketAlert();
  const { mutateAsync: deleteAlert } = useDeleteMarketAlert();

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const hasAlerts = activeAlerts.length > 0;

  const pYes = probability(m.pool, "YES") * 100;
  const pNo = 100 - pYes;

  const handleCreate = async () => {
    const currentPct = side === "YES" ? pYes : pNo;
    if (threshold <= currentPct) {
      toast.error(
        `Probabilidade ${side === "YES" ? "SIM" : "NÃO"} já está em ${currentPct.toFixed(1)}% — defina um valor maior.`,
      );
      return;
    }
    try {
      await createAlert({ marketId: m.id, side, threshold });
      toast.success(`Alerta criado: ${side === "YES" ? "SIM" : "NÃO"} ≥ ${threshold}%`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar alerta.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Criar alerta de probabilidade"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition",
          hasAlerts
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
        )}
      >
        {hasAlerts ? <Bell className="size-3.5 fill-primary" /> : <Bell className="size-3.5" />}
        {hasAlerts
          ? `${activeAlerts.length} alerta${activeAlerts.length > 1 ? "s" : ""}`
          : "Alerta"}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              Alertas de probabilidade
            </SheetTitle>
          </SheetHeader>

          {activeAlerts.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ativos neste mercado
              </p>
              {activeAlerts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border bg-surface/60 px-3 py-2 text-sm"
                >
                  <span>
                    <span className={cn("font-medium", a.side === "YES" ? "text-up" : "text-down")}>
                      {a.side === "YES" ? "SIM" : "NÃO"}
                    </span>{" "}
                    ≥ <span className="mono font-medium">{a.threshold}%</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteAlert(a.id).then(() => toast.message("Alerta removido"))}
                    className="rounded-lg p-1 text-muted-foreground hover:text-down"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Novo alerta
            </p>

            {/* Lado */}
            <div className="grid grid-cols-2 gap-2">
              {(["YES", "NO"] as const).map((s) => {
                const p = s === "YES" ? pYes : pNo;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition",
                      side === s
                        ? s === "YES"
                          ? "border-up/60 bg-up/15"
                          : "border-down/60 bg-down/15"
                        : "border-border bg-surface",
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-medium uppercase",
                        s === "YES" ? "text-up" : "text-down",
                      )}
                    >
                      {s === "YES" ? "SIM" : "NÃO"}
                    </div>
                    <div className="mono text-lg font-semibold">{p.toFixed(1)}%</div>
                    <div className="text-[10px] text-muted-foreground">atual</div>
                  </button>
                );
              })}
            </div>

            {/* Threshold presets */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Avisar quando chegar em:</p>
              <div className="flex flex-wrap gap-2">
                {THRESHOLD_PRESETS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setThreshold(pct)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm mono transition",
                      threshold === pct
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border hover:bg-surface-2",
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={1}
                max={99}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-3 w-full accent-primary"
              />
              <div className="mt-1 text-center text-xs text-muted-foreground">
                Alerta em <span className="font-medium text-foreground">{threshold}%</span>
              </div>
            </div>

            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-60 hover:opacity-90 transition"
            >
              {creating
                ? "Criando…"
                : `Avisar quando ${side === "YES" ? "SIM" : "NÃO"} ≥ ${threshold}%`}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
