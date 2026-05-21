import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import type { Market, Side } from "@/store/viax-store";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { useViaX } from "@/store/viax-store";
import { usePlaceBet } from "@/hooks/use-place-bet";
import { supabase } from "@/integrations/supabase/client";
import { copy, toastBetSuccess } from "@/copy/pt-BR";
import { estimatePayout, probability, formatBRL, formatPct, prizePool } from "@/lib/parimutuel";
import { EdgeBadge } from "@/components/viax/edge-badge";
import { AnimatedNumber } from "./animated-number";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";

export function OrderBox({
  m,
  initialSide = "YES",
  onSuccess,
  className,
}: {
  m: Market;
  initialSide?: Side;
  onSuccess?: () => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const zustandBalance = useViaX((s) => s.me.balance);
  const balance = profile?.balance ?? zustandBalance;

  const { mutateAsync: placeBet, isPending } = usePlaceBet();
  const [side, setSide] = useState<Side>(initialSide);
  const [stake, setStake] = useState(100);

  useEffect(() => {
    setSide(initialSide);
  }, [initialSide, m.id]);

  const resolved = m.status === "resolved";
  const est = estimatePayout(m.pool, side, stake);
  const pY = probability(m.pool, "YES");
  const fixedPresets = [50, 100, 250, 500];
  const pctPresets = useMemo(
    () =>
      [0.05, 0.1, 0.25].map((pct) => ({
        label: `${(pct * 100).toFixed(0)}%`,
        value: Math.max(10, Math.floor(balance * pct)),
      })),
    [balance],
  );
  const insufficient = stake > balance;
  const maxAffordable = Math.max(10, Math.floor(balance));

  const submit = async () => {
    if (resolved) return;
    if (stake <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (stake > balance) {
      toast.error("Saldo insuficiente", {
        description: `Disponível: ${formatBRL(balance)}`,
        action: {
          label: "Carteira",
          onClick: () => navigate({ to: "/profile", search: { tab: "carteira" } }),
        },
      });
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
      const toastCopy = toastBetSuccess(side, formatBRL(stake), formatBRL(est.payout));
      toast.success(toastCopy.title, {
        description: toastCopy.description,
        action: {
          label: copy.nav.positions,
          onClick: () => navigate({ to: "/profile", search: { tab: "posicoes" } }),
        },
        cancel: {
          label: copy.dashboard.viewPanel,
          onClick: () => navigate({ to: "/dashboard", search: { highlight: "position" } }),
        },
      });
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user?.email) {
        toast.message("Conta anônima", {
          description: "Vincule um e-mail no perfil para não perder seu histórico.",
          action: { label: "Perfil", onClick: () => navigate({ to: "/profile" }) },
        });
      }
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao colocar aposta");
    }
  };

  if (resolved) {
    const winSide = m.resolved;
    return (
      <div className={cn("rounded-2xl border bg-card/60 p-5 backdrop-blur", className)}>
        <h4 className="text-sm font-medium">{copy.bet.resolvedTitle}</h4>
        <p className="mt-2 text-sm text-muted-foreground">
          {copy.bet.resolvedResult}{" "}
          <span className={cn("font-medium mono", winSide === "YES" ? "text-up" : "text-down")}>
            {winSide === "YES" ? "↑ SIM" : "↓ NÃO"}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/profile"
            search={{ tab: "carteira" }}
            className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/15"
          >
            {copy.bet.viewWallet}
          </Link>
          <Link
            to="/profile"
            search={{ tab: "posicoes" }}
            className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-2"
          >
            {copy.bet.viewHistory}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/60 p-5 backdrop-blur shadow-[var(--shadow-elevated)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium">{copy.bet.operateMarket}</h4>
        <EdgeBadge m={m} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["YES", "NO"] as const).map((s) => {
          const active = side === s;
          const isYes = s === "YES";
          const p = isYes ? pY : 1 - pY;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setSide(s)}
              className={cn(
                "relative rounded-xl border p-3 text-left transition",
                active
                  ? isYes
                    ? "border-up/60 bg-up/15 shadow-[var(--shadow-glow-up)]"
                    : "border-down/60 bg-down/15 shadow-[var(--shadow-glow-down)]"
                  : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1 text-xs uppercase tracking-wider",
                  isYes ? "text-up" : "text-down",
                )}
              >
                {isYes ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                {s === "YES" ? "SIM" : "NÃO"}
              </div>
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
        <div className="mt-2 flex flex-wrap gap-2">
          {fixedPresets.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setStake(Math.min(v, balance))}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs mono hover:bg-surface-2"
            >
              R$ {v}
            </button>
          ))}
          {pctPresets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setStake(p.value)}
              className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs mono text-primary hover:bg-primary/20"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setStake(maxAffordable)}
            className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
          >
            Máx
          </button>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Saldo: <span className="mono text-foreground">{formatBRL(balance)}</span>
        </div>
        {insufficient && balance > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs">
            <span className="text-warn">Saldo insuficiente.</span>
            <button
              type="button"
              onClick={() => setStake(maxAffordable)}
              className="text-primary hover:underline"
            >
              Usar {formatBRL(maxAffordable)}
            </button>
            <Link
              to="/profile"
              search={{ tab: "carteira" }}
              className="text-primary hover:underline"
            >
              Carteira →
            </Link>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 rounded-xl border bg-surface/60 p-3 text-sm">
        <Row
          label={copy.bet.prizeTotal}
          value={
            <AnimatedNumber
              value={prizePool(m.pool)}
              format={formatBRL}
              className="text-foreground"
            />
          }
        />
        <Row
          label={copy.bet.yourShare}
          value={<span className="mono">{formatPct(est.share, 2)}</span>}
        />
        <Row
          label={copy.bet.potentialWin}
          value={
            <AnimatedNumber
              value={est.payout}
              format={formatBRL}
              className={side === "YES" ? "text-up" : "text-down"}
            />
          }
        />
        <Row
          label={copy.bet.estimatedReturn}
          value={
            <span className={cn("mono", est.roi >= 0 ? "text-up" : "text-down")}>
              {formatPct(est.roi, 1)}
            </span>
          }
        />
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={submit}
        disabled={isPending || insufficient || stake <= 0}
        className={cn(
          "mt-4 w-full rounded-xl px-4 py-3 font-medium transition disabled:opacity-60",
          side === "YES"
            ? "bg-gradient-to-r from-up to-up/80 text-up-foreground hover:shadow-[var(--shadow-glow-up)]"
            : "bg-gradient-to-r from-down to-down/80 text-down-foreground hover:shadow-[var(--shadow-glow-down)]",
        )}
      >
        {isPending ? copy.bet.processing : copy.bet.operateCta(side, formatBRL(stake))}
      </motion.button>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">{copy.bet.poolNote}</p>
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
