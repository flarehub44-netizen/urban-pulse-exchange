import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import type { Market, Side } from "@/store/viax-store";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { useProfile } from "@/hooks/use-profile";
import { useViaX } from "@/store/viax-store";
import { usePlaceBet } from "@/hooks/use-place-bet";
import { supabase } from "@/integrations/supabase/client";
import { copy, toastBetSuccess } from "@/copy/pt-BR";
import type { AchievementUnlock } from "@/actions/retention";
import {
  CURRENCY_CODE,
  estimatePayout,
  probability,
  formatBRL,
  formatPct,
  prizePool,
  poolImbalanceWarning,
} from "@/lib/parimutuel";
import { canPlaceBets, isSettledDisplay } from "@/lib/market-status";
import { EdgeBadge } from "@/components/viax/edge-badge";
import { ImpulseDepositBar } from "@/components/viax/impulse-deposit-bar";
import { useCasinoEnabled } from "@/hooks/use-casino-enabled";
import { BetConfirmDialog } from "@/components/viax/bet-confirm-dialog";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, BookOpen } from "lucide-react";
import { saveBetNoteFn } from "@/actions/bets";
import { trackProductEvent } from "@/lib/product-analytics";

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
  const { openSignup } = useAuthModal();
  const { openDeposit } = useDepositSheet();
  const { userId, isRegistered } = useAuth();
  const { data: profile } = useProfile(userId);
  const zustandBalance = useViaX((s) => s.me.balance);
  const balance = profile?.balance ?? zustandBalance;

  const { mutateAsync: placeBet, isPending } = usePlaceBet();
  const { enabled: casinoEnabled } = useCasinoEnabled();
  const [side, setSide] = useState<Side>(initialSide);
  const [stake, setStake] = useState(100);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setSide(initialSide);
  }, [initialSide, m.id]);

  const settled = isSettledDisplay(m.status);
  const canBet = canPlaceBets(m.status, m.acceptBets ?? true, m.endsAt);
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
  const imbalanceWarn = poolImbalanceWarning(m.pool.YES, m.pool.NO);

  const openConfirm = () => {
    if (!canBet) return;
    if (!isRegistered) {
      toast.error(copy.auth.registerRequired, {
        action: {
          label: copy.auth.registerCta,
          onClick: () => openSignup({ depositAfter: true }),
        },
      });
      return;
    }
    if (stake <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (stake > balance) {
      toast.error("Saldo insuficiente", {
        description: `Disponível: ${formatBRL(balance)}`,
        action: {
          label: copy.depositFunnel.insufficientCta,
          onClick: () => {
            trackProductEvent("click_deposit", { source: "order_box_insufficient_toast" });
            openDeposit({ amount: Math.max(stake, 200) });
          },
        },
      });
      return;
    }
    setConfirmOpen(true);
  };

  const submit = async () => {
    if (!canBet) return;
    if (stake <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (stake > balance) {
      toast.error("Saldo insuficiente", {
        description: `Disponível: ${formatBRL(balance)}`,
        action: {
          label: "Carteira",
          onClick: () => navigate({ to: "/wallet" }),
        },
      });
      return;
    }
    try {
      const result = await placeBet({ marketId: m.id, side, stake });
      const depositAt = Number(sessionStorage.getItem("viax_last_deposit_confirmed_at") ?? "0");
      if (depositAt > 0) {
        trackProductEvent("first_bet_after_deposit", {
          marketId: m.id,
          stake,
          minutesAfterDeposit: Math.round((Date.now() - depositAt) / 60000),
        });
        sessionStorage.removeItem("viax_last_deposit_confirmed_at");
      }
      const betId = (result as { bet_id?: string }).bet_id;
      if (betId && note.trim()) {
        saveBetNoteFn({ data: { bet_id: betId, note: note.trim() } }).catch(() => {});
      }
      const unlocked = (result as { progress?: { achievements_unlocked?: AchievementUnlock[] } })
        ?.progress?.achievements_unlocked;
      if (unlocked?.length) {
        for (const a of unlocked) {
          toast.success(copy.retention.achievementUnlocked(a.name), { description: a.description });
        }
      }
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
          onClick: () => navigate({ to: "/positions" }),
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
      setConfirmOpen(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.bet.placeError);
    }
  };

  if (m.status === "draft") {
    return (
      <div className={cn("rounded-2xl border bg-card/60 p-5 backdrop-blur", className)}>
        <h4 className="text-sm font-medium">{copy.bet.draftTitle}</h4>
        <p className="mt-2 text-sm text-muted-foreground">{copy.bet.draftDesc}</p>
      </div>
    );
  }

  if (m.status === "closed") {
    return (
      <div className={cn("rounded-2xl border bg-card/60 p-5 backdrop-blur", className)}>
        <h4 className="text-sm font-medium">{copy.bet.closedTitle}</h4>
        <p className="mt-2 text-sm text-muted-foreground">{copy.bet.closedDesc}</p>
      </div>
    );
  }

  if (m.status === "resolving") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-primary/30 bg-primary/5 p-5 backdrop-blur",
          className,
        )}
      >
        <h4 className="text-sm font-medium">{copy.bet.resolvingTitle}</h4>
        <p className="mt-2 text-sm text-muted-foreground">{copy.bet.resolvingDesc}</p>
      </div>
    );
  }

  if (m.status === "dispute") {
    return (
      <div
        className={cn("rounded-2xl border border-warn/30 bg-warn/5 p-5 backdrop-blur", className)}
      >
        <h4 className="text-sm font-medium">{copy.bet.disputeTitle}</h4>
        <p className="mt-2 text-sm text-muted-foreground">{copy.bet.disputeDesc}</p>
      </div>
    );
  }

  if (m.status === "void") {
    return (
      <div className={cn("rounded-2xl border bg-card/60 p-5 backdrop-blur", className)}>
        <h4 className="text-sm font-medium">{copy.bet.voidTitle}</h4>
        <p className="mt-2 text-sm text-muted-foreground">{copy.bet.voidDesc}</p>
        <Link
          to="/wallet"
          className="mt-4 inline-block rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/15"
        >
          {copy.bet.viewWallet}
        </Link>
      </div>
    );
  }

  if (settled) {
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
            to="/wallet"
            className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/15"
          >
            {copy.bet.viewWallet}
          </Link>
          <Link
            to="/positions"
            className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-2"
          >
            {copy.bet.viewHistory}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="order-box" className={cn("surface-card-featured", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="heading-section">
          Prever neste <span className="text-highlight">mercado</span>
        </h4>
        <EdgeBadge m={m} />
      </div>

      {casinoEnabled && (insufficient || balance < 80) && (
        <ImpulseDepositBar
          balance={balance}
          className="mt-3"
          context={insufficient ? "after_loss" : "low_balance"}
          suggestedAmount={insufficient ? Math.ceil(stake * 1.2) : undefined}
        />
      )}

      {imbalanceWarn && (
        <p className="mt-3 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
          {imbalanceWarn}
        </p>
      )}

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
                  "flex items-center gap-2 text-xs uppercase tracking-wider",
                  isYes ? "text-up" : "text-down",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full",
                    active ? (isYes ? "bg-up/15" : "bg-down/15") : "bg-surface-2",
                  )}
                >
                  {isYes ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                </span>
                {s === "YES" ? "SIM" : "NÃO"}
              </div>
              <div className="mt-1 text-2xl font-semibold mono">{(p * 100).toFixed(1)}%</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Valor</label>
        <div className="mt-1 flex items-center gap-2 rounded-xl border bg-surface px-3 py-2">
          <input
            type="number"
            data-testid="order-box-stake"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value) || 0)}
            className="w-full bg-transparent mono text-lg outline-none"
          />
          <span className="shrink-0 text-muted-foreground text-sm">{CURRENCY_CODE}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {fixedPresets.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setStake(Math.min(v, balance))}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs mono hover:bg-surface-2"
            >
              {formatBRL(v)}
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
            {isRegistered && (
              <button
                type="button"
                onClick={() => {
                  trackProductEvent("click_deposit", { source: "order_box_inline_insufficient" });
                  openDeposit({ amount: Math.max(stake, 200), source: "order_box" });
                }}
                className="font-medium text-primary hover:underline"
              >
                {copy.depositFunnel.insufficientCta}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowNote((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="size-3.5" />
          {showNote ? "Ocultar diário" : "Anotar raciocínio (opcional)"}
        </button>
        {showNote && (
          <div className="mt-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 140))}
              placeholder={copy.bet.rationalePlaceholder}
              rows={2}
              className="w-full resize-none rounded-lg border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50"
            />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">
              {note.length}/140
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 rounded-xl border bg-surface/60 p-3 text-sm">
        <Row
          label={copy.bet.prizeTotal}
          value={<span className="mono text-foreground">{formatBRL(prizePool(m.pool))}</span>}
        />
        <Row
          label={copy.bet.yourShare}
          value={<span className="mono">{formatPct(est.share, 2)}</span>}
        />
        <Row
          label={copy.bet.potentialWin}
          value={
            <span className={cn("mono", side === "YES" ? "text-up" : "text-down")}>
              {formatBRL(est.payout)}
            </span>
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

      <BetConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        side={side}
        stake={stake}
        estimatedPayout={est.payout}
        prizePool={prizePool(m.pool)}
        question={m.question}
        onConfirm={submit}
        isPending={isPending}
      />

      <motion.button
        data-testid="order-box-operate"
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={
          insufficient && isRegistered
            ? () => {
                trackProductEvent("click_deposit", { source: "order_box_primary" });
                openDeposit({ amount: Math.max(stake, 200), source: "order_box" });
              }
            : openConfirm
        }
        disabled={isPending || stake <= 0 || (insufficient && !isRegistered)}
        className={cn(
          "mt-4 w-full rounded-xl px-4 py-3 font-medium transition disabled:opacity-60",
          insufficient && isRegistered
            ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            : side === "YES"
              ? "bg-gradient-to-r from-up to-up/80 text-up-foreground hover:shadow-[var(--shadow-glow-up)]"
              : "bg-gradient-to-r from-down to-down/80 text-down-foreground hover:shadow-[var(--shadow-glow-down)]",
        )}
      >
        {isPending
          ? copy.bet.processing
          : insufficient && isRegistered
            ? copy.depositFunnel.insufficientCta
            : copy.bet.operateCta(side, formatBRL(stake))}
      </motion.button>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        {m.marketKind === "community" ? copy.community.poolNote : copy.bet.poolNote}
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
