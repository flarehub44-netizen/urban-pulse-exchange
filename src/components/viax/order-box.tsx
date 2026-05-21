import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import type { Market, Side } from "@/store/viax-store";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { useViaX } from "@/store/viax-store";
import { usePlaceBet } from "@/hooks/use-place-bet";
import { estimatePayout, probability, formatBRL, formatPct, prizePool, poolTotal } from "@/lib/parimutuel";
import { AnimatedNumber } from "./animated-number";
import { cn } from "@/lib/utils";

export function OrderBox({ m }: { m: Market }) {
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const zustandBalance = useViaX((s) => s.me.balance);
  const balance = profile?.balance ?? zustandBalance;

  const { mutateAsync: placeBet, isPending } = usePlaceBet();
  const [side, setSide] = useState<Side>("YES");
  const [stake, setStake] = useState(100);

  const est = estimatePayout(m.pool, side, stake);
  const pY = probability(m.pool, "YES");

  const presets = [50, 100, 250, 500];

  const submit = async () => {
    if (stake <= 0 || stake > balance) {
      toast.error("Saldo insuficiente");
      return;
    }
    try {
      await placeBet({ marketId: m.id, side, stake });
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: side === "YES" ? ["#22d3a8", "#86efac"] : ["#f87171", "#fb7185"],
      });
      toast.success(`Posição ${side} · ${formatBRL(stake)}`, {
        description: `Payout potencial ${formatBRL(est.payout)}`,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao colocar aposta");
    }
  };

  return (
    <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur shadow-[var(--shadow-elevated)]">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Operar mercado</h4>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Parimutuel</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["YES", "NO"] as const).map((s) => {
          const active = side === s;
          const isYes = s === "YES";
          const p = isYes ? pY : 1 - pY;
          return (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={cn(
                "relative rounded-xl border p-3 text-left transition",
                active
                  ? isYes ? "border-up/60 bg-up/15 shadow-[var(--shadow-glow-up)]"
                          : "border-down/60 bg-down/15 shadow-[var(--shadow-glow-down)]"
                  : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              <div className={cn("text-xs uppercase tracking-wider", isYes ? "text-up" : "text-down")}>{s === "YES" ? "SIM" : "NÃO"}</div>
              <div className="mt-1 text-2xl font-semibold mono">{(p * 100).toFixed(1)}%</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor</label>
        <div className="mt-1 flex items-center gap-2 rounded-xl border bg-surface px-3 py-2">
          <span className="text-muted-foreground">R$</span>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value) || 0)}
            className="w-full bg-transparent mono text-lg outline-none"
          />
        </div>
        <div className="mt-2 flex gap-2">
          {presets.map((v) => (
            <button key={v} onClick={() => setStake(v)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs mono hover:bg-surface-2">
              R$ {v}
            </button>
          ))}
          <button onClick={() => setStake(Math.floor(balance))}
            className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20">
            Máx
          </button>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">Saldo: <span className="mono text-foreground">{formatBRL(balance)}</span></div>
      </div>

      <div className="mt-4 space-y-2 rounded-xl border bg-surface/60 p-3 text-sm">
        <Row label="Prize Pool atual" value={<AnimatedNumber value={prizePool(m.pool)} format={formatBRL} className="text-foreground" />} />
        <Row label="Sua participação" value={<span className="mono">{formatPct(est.share, 2)}</span>} />
        <Row label="Payout potencial" value={<AnimatedNumber value={est.payout} format={formatBRL} className={side === "YES" ? "text-up" : "text-down"} />} />
        <Row label="ROI estimado" value={<span className={cn("mono", est.roi >= 0 ? "text-up" : "text-down")}>{formatPct(est.roi, 1)}</span>} />
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={submit}
        disabled={isPending}
        className={cn(
          "mt-4 w-full rounded-xl px-4 py-3 font-medium transition disabled:opacity-60",
          side === "YES"
            ? "bg-gradient-to-r from-up to-up/80 text-up-foreground hover:shadow-[var(--shadow-glow-up)]"
            : "bg-gradient-to-r from-down to-down/80 text-down-foreground hover:shadow-[var(--shadow-glow-down)]",
        )}
      >
        {isPending ? "Processando..." : `Operar ${side === "YES" ? "SIM" : "NÃO"} · ${formatBRL(stake)}`}
      </motion.button>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        Pool distribuível: 90% do pool total · Resolução automática pela UrbanMind AI
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
