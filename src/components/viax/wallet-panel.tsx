import { Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useViaX } from "@/store/viax-store";
import { toast } from "sonner";
import { useCasinoEnabled } from "@/hooks/use-casino-enabled";
import { useCasinoQuickDeposit } from "@/hooks/use-casino-spin";
import { ImpulseDepositChips } from "@/components/viax/impulse-deposit-bar";
import { setLastImpulseAmount } from "@/lib/impulse-deposit";
import { initiateDepositFn, initiateWithdrawFn, getDepositStatusFn } from "@/actions/payments";
import { Copy, QrCode, Clock } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { useBalanceSeries } from "@/hooks/use-balance-series";
import { useAuth } from "@/hooks/use-auth";
import { RegisterRequiredCta } from "@/components/auth/register-required-cta";
import { PaymentInfoBanner } from "@/components/viax/simulated-money-banner";
import { useBets } from "@/hooks/use-bets";
import {
  useResolvedProfile,
  useResolvedTransactions,
  useResolvedMarkets,
} from "@/hooks/use-resolved-data";
import type { Market } from "@/store/viax-store";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { formatBRL } from "@/lib/parimutuel";
import { ArrowDownLeft, ArrowUpRight, Plus, Minus, Trophy } from "lucide-react";
import { EmptyState } from "@/components/viax/empty-state";
import { cn } from "@/lib/utils";
import { trackDepositFunnel } from "@/lib/deposit-funnel";
import { trackProductEvent } from "@/lib/product-analytics";

const WalletBalanceChart = lazy(() =>
  import("@/components/viax/wallet-balance-chart").then((m) => ({
    default: m.WalletBalanceChart,
  })),
);
import { isOpenBetStatus } from "@/lib/market-status";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const walletTabs = [
  { key: "overview", label: "Visão geral" },
  { key: "history", label: "Histórico" },
  { key: "deposit", label: "Depositar" },
  { key: "withdraw", label: "Sacar" },
] as const;
type WalletTab = (typeof walletTabs)[number]["key"];

export function WalletPanel({
  embedded,
  initialTab,
}: {
  embedded?: boolean;
  initialTab?: WalletTab;
}) {
  const navigate = useNavigate();
  const { isRegistered } = useAuth();
  const { me } = useResolvedProfile();
  const { transactions: tx } = useResolvedTransactions();
  const { data: bets } = useBets();
  const { markets: allMarkets } = useResolvedMarkets();
  const [tab, setTab] = useState<WalletTab>(initialTab ?? "overview");
  const [betFilter, setBetFilter] = useState<"todos" | "wins" | "losses">("todos");
  const [walletAmount, setWalletAmount] = useState("200");
  const [pixKey, setPixKey] = useState("");
  const [depositQr, setDepositQr] = useState<{
    qrCode: string;
    qrCodeImg: string;
    intentId: string;
    providerId: string;
    expiresAt: string;
  } | null>(null);
  const [depositDone, setDepositDone] = useState(false);
  const { enabled: casinoEnabled } = useCasinoEnabled();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!initialTab) return;
    setTab(initialTab);
  }, [initialTab]);

  const updateTab = (nextTab: WalletTab) => {
    setTab(nextTab);
    if (!embedded) {
      navigate({ to: "/wallet", search: nextTab === "overview" ? {} : { tab: nextTab }, replace: true });
    }
    trackProductEvent("wallet_tab_changed", { tab: nextTab, embedded: !!embedded });
  };

  const depositMut = useMutation({
    mutationFn: (amount: number) => initiateDepositFn({ data: { amount } }),
    onSuccess: (res) => {
      trackDepositFunnel("deposit_qr_shown", { amount: Number(walletAmount) || 0 });
      trackProductEvent("deposit_qr_generated", { amount: Number(walletAmount) || 0, source: "wallet" });
      setDepositQr({
        qrCode: res.qrCode,
        qrCodeImg: res.qrCodeImg,
        intentId: res.intentId,
        providerId: res.providerId,
        expiresAt: res.expiresAt,
      });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Depósito falhou."),
  });

  const withdrawMut = useMutation({
    mutationFn: ({ amount, pixKey: pk }: { amount: number; pixKey: string }) =>
      initiateWithdrawFn({ data: { amount, pixKey: pk } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Saque solicitado! O valor será transferido em instantes.");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Saque falhou.";
      if (msg.includes("kyc_required")) {
        toast.error("Verificação necessária", {
          description: "Complete o KYC para sacar acima de 100 BRL.",
        });
      } else {
        toast.error(msg);
      }
    },
  });

  // Polling: verifica se o depósito foi confirmado (a cada 5s enquanto QR exibido)
  useEffect(() => {
    if (!depositQr || depositDone) return;
    const interval = setInterval(async () => {
      try {
        const status = await getDepositStatusFn({ data: { intentId: depositQr.intentId } });
        if (status.status === "paid") {
          sessionStorage.setItem("viax_last_deposit_confirmed_at", String(Date.now()));
          trackDepositFunnel("deposit_paid", { amount: status.amount });
          trackProductEvent("deposit_confirmed", { amount: status.amount, source: "wallet" });
          setDepositDone(true);
          setDepositQr(null);
          queryClient.invalidateQueries({ queryKey: ["me"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          toast.success("Depósito confirmado!", {
            description: `${formatBRL(status.amount)} adicionado ao seu saldo.`,
          });
        } else if (status.status === "failed" || status.status === "expired") {
          setDepositQr(null);
          toast.error("QR Code expirado ou pagamento falhou. Tente novamente.");
        }
      } catch {
        /* silencioso */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [depositQr, depositDone, queryClient]);
  const quickDeposit = useCasinoQuickDeposit();

  const balanceSeries = useBalanceSeries(tx);
  const balanceCurve = balanceSeries.length
    ? balanceSeries.map((p) => ({ d: p.label || String(p.d), v: p.v }))
    : [{ d: "—", v: me.balance }];

  const volumeMoved = useMemo(
    () =>
      tx.filter((t) => t.type === "entry" || t.type === "payout").reduce((a, t) => a + t.amount, 0),
    [tx],
  );
  const marketsOperated = useMemo(() => new Set((bets ?? []).map((b) => b.marketId)).size, [bets]);

  return (
    <div className="space-y-5">
      {!embedded && (
        <div>
          <h1 className="heading-page text-2xl">
            <span className="text-highlight">Carteira</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.wallet.subtitle}</p>
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Saldo disponível
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <AnimatedNumber
            value={me.balance}
            format={formatBRL}
            className="text-4xl font-semibold tracking-tight md:text-5xl"
          />
          <span className="text-sm text-up">+{formatBRL(me.pnl)} (30d)</span>
        </div>
        {me.balance < 150 && (
          <div className="mt-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{copy.wallet.lowBalance} </span>
            <Link
              to="/markets"
              search={{ status: "live" }}
              className="text-primary hover:underline"
            >
              Explorar mercados ao vivo →
            </Link>
          </div>
        )}
      </div>

      <div className="surface-card p-3">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface/60" />}>
          <WalletBalanceChart data={balanceCurve} />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          label={copy.wallet.totalReturn}
          value={
            <>
              <AnimatedNumber value={me.roi * 100} decimals={1} suffix="%" className="text-up" />
            </>
          }
        />
        <KPI
          label="Volume movimentado"
          value={<AnimatedNumber value={volumeMoved || me.volume24h} format={formatBRL} />}
        />
        <KPI
          label="Mercados operados"
          value={<AnimatedNumber value={marketsOperated || (bets?.length ?? 0)} />}
        />
        <KPI label="Streak ativa" value={<>🔥 {me.streak}</>} />
      </div>

      <div className="flex flex-wrap gap-2">
        {walletTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => updateTab(t.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              tab === t.key
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-surface-2",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="surface-card p-4">
            <h3 className="heading-section">
              <span className="text-highlight">Atalhos</span>
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateTab("deposit")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-up/40 bg-up/10 px-3 py-2.5 text-sm font-medium text-up hover:bg-up/20"
              >
                <Plus className="size-4" /> Depositar
              </button>
              <button
                type="button"
                onClick={() => updateTab("withdraw")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-down/40 bg-down/10 px-3 py-2.5 text-sm font-medium text-down hover:bg-down/20"
              >
                <Minus className="size-4" /> Sacar
              </button>
            </div>
          </div>
          <RecentTx tx={tx.slice(0, 5)} />
        </div>
      )}

      {tab === "history" && (
        <EnrichedHistory
          bets={bets ?? []}
          tx={tx}
          markets={allMarkets}
          betFilter={betFilter}
          setBetFilter={setBetFilter}
        />
      )}

      {(tab === "deposit" || tab === "withdraw") && !isRegistered && <RegisterRequiredCta />}

      {(tab === "deposit" || tab === "withdraw") && isRegistered && (
        <div className="surface-card mx-auto max-w-md space-y-4">
          <h3 className="heading-section">
            {tab === "deposit" ? (
              <>
                Adicionar <span className="text-highlight">saldo</span>
              </>
            ) : (
              <>
                Sacar para <span className="text-highlight">conta Pix</span>
              </>
            )}
          </h3>

          {/* QR Code exibido após gerar o depósito */}
          {depositQr && tab === "deposit" ? (
            <div className="space-y-4 text-center">
              <span
                data-testid="deposit-intent-id"
                data-provider-id={depositQr.providerId}
                className="sr-only"
              >
                {depositQr.intentId}
              </span>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3" />
                <span>Escaneie o QR Code no app do seu banco</span>
              </div>
              {depositQr.qrCodeImg ? (
                <img
                  src={`data:image/png;base64,${depositQr.qrCodeImg}`}
                  alt="QR Code Pix"
                  className="mx-auto size-48 rounded-xl border"
                />
              ) : (
                <div className="mx-auto flex size-48 items-center justify-center rounded-xl border bg-surface-2">
                  <QrCode className="size-16 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(depositQr.qrCode);
                  toast.success("Código Pix copiado!");
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-surface px-3 py-2 text-xs hover:bg-surface-2"
              >
                <Copy className="size-3" /> Pix Copia e Cola
              </button>
              <p className="text-[11px] text-muted-foreground">
                Aguardando confirmação do banco… O saldo será atualizado automaticamente.
              </p>
              <button
                type="button"
                onClick={() => setDepositQr(null)}
                className="text-xs text-muted-foreground underline"
              >
                Cancelar e gerar novo código
              </button>
            </div>
          ) : (
            <>
              {tab === "deposit" && <PaymentInfoBanner context="wallet" className="mb-1" />}

              {tab === "deposit" && casinoEnabled && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">{copy.casino.impulseDepositTitle}</p>
                  <ImpulseDepositChips
                    disabled={quickDeposit.isPending || depositMut.isPending}
                    onSelect={(amt) => {
                      setWalletAmount(String(amt));
                      setLastImpulseAmount(amt);
                    }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground">
                  Valor
                </label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border bg-surface px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="w-full bg-transparent mono text-lg outline-none"
                  />
                  <span className="shrink-0 text-muted-foreground text-sm">BRL</span>
                </div>
              </div>

              {tab === "withdraw" && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted-foreground">
                    Chave Pix (CPF, e-mail, celular ou chave aleatória)
                  </label>
                  <input
                    type="text"
                    placeholder="sua@chave.pix"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  {Number(walletAmount) > 100 && (
                    <p className="mt-1 text-[11px] text-warn">
                      Saques acima de 100 BRL exigem verificação de identidade (KYC).
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={depositMut.isPending || withdrawMut.isPending}
                onClick={async () => {
                  const amount = Number(walletAmount);
                  if (!amount || amount <= 0) {
                    toast.error("Informe um valor válido.");
                    return;
                  }
                  if (tab === "deposit") {
                    depositMut.mutate(amount);
                  } else {
                    if (!pixKey.trim()) {
                      toast.error("Informe sua chave Pix.");
                      return;
                    }
                    withdrawMut.mutate({ amount, pixKey: pixKey.trim() });
                  }
                }}
                className={cn(
                  "w-full rounded-xl px-4 py-3 font-medium disabled:opacity-50",
                  tab === "Depositar" ? "bg-up text-up-foreground" : "bg-down text-down-foreground",
                )}
              >
                {depositMut.isPending || withdrawMut.isPending
                  ? "Processando…"
                  : tab === "deposit"
                    ? "Gerar QR Code Pix"
                    : "Solicitar Saque"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type BetFilter = "todos" | "wins" | "losses";

function EnrichedHistory({
  bets,
  tx,
  markets,
  betFilter,
  setBetFilter,
}: {
  bets: NonNullable<ReturnType<typeof useBets>["data"]>;
  tx: ReturnType<typeof useViaX.getState>["transactions"];
  markets: Market[];
  betFilter: BetFilter;
  setBetFilter: (f: BetFilter) => void;
}) {
  const resolved = bets.filter((b) => !isOpenBetStatus(b.marketStatus));
  const wins = resolved.filter((b) => b.payout != null && b.payout > 0);
  const losses = resolved.filter(
    (b) =>
      (b.marketStatus === "settled" || b.marketStatus === "resolved") &&
      (b.payout == null || b.payout === 0),
  );
  const deposits = tx.filter((t) => t.type === "deposit" || t.type === "withdraw");

  const shown = betFilter === "wins" ? wins : betFilter === "losses" ? losses : resolved;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["todos", "wins", "losses"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setBetFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              betFilter === f
                ? f === "wins"
                  ? "border-up/60 bg-up/15 text-up"
                  : f === "losses"
                    ? "border-down/60 bg-down/15 text-down"
                    : "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-surface-2",
            )}
          >
            {f === "todos"
              ? copy.wallet.predictionsTab(resolved.length)
              : f === "wins"
                ? `✓ Vitórias (${wins.length})`
                : `✗ Derrotas (${losses.length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <EmptyState
          icon={Trophy}
          title={copy.empty.wallet.title}
          description={copy.empty.wallet.description}
          action={{ label: copy.empty.wallet.cta, to: "/markets", search: { status: "live" } }}
        />
      )}

      <div className="space-y-2">
        {shown.map((b) => {
          const isWin = b.payout != null && b.payout > 0;
          const roi =
            b.payout != null && b.stake > 0 ? ((b.payout - b.stake) / b.stake) * 100 : null;
          const mkt = markets.find((m) => m.id === b.marketId);
          const vsAi =
            mkt && b.marketStatus === "settled"
              ? b.side === mkt.aiPrediction.side
                ? "Com IA"
                : "Contra IA"
              : null;
          return (
            <div key={b.id} className="overflow-hidden rounded-xl border bg-card/60 backdrop-blur">
              <div className="flex items-start gap-3 p-4">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    isWin ? "border-up/30 bg-up/10 text-up" : "border-down/30 bg-down/10 text-down",
                  )}
                >
                  {isWin ? "W" : "L"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-medium">{b.marketQuestion}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className={cn("font-medium", b.side === "YES" ? "text-up" : "text-down")}>
                      {b.side === "YES" ? "↑ SIM" : "↓ NÃO"}
                    </span>
                    {vsAi && (
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px]",
                          vsAi === "Com IA" ? "border-up/30 text-up" : "border-warn/30 text-warn",
                        )}
                      >
                        {vsAi}
                      </span>
                    )}
                    <span>
                      {copy.wallet.stakeLabel}:{" "}
                      <span className="mono text-foreground">{formatBRL(b.stake)}</span>
                    </span>
                    {b.payout != null && (
                      <span>
                        {copy.positions.payout}{" "}
                        <span className={cn("mono", isWin ? "text-up" : "text-down")}>
                          {formatBRL(b.payout)}
                        </span>
                      </span>
                    )}
                    {roi != null && (
                      <span className={cn("mono font-medium", roi >= 0 ? "text-up" : "text-down")}>
                        {roi >= 0 ? "+" : ""}
                        {roi.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{b.marketRegion}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {deposits.length > 0 && (
        <div>
          <h3 className="heading-subsection mb-2">
            <span className="text-highlight">Movimentações</span>
          </h3>
          <RecentTx tx={deposits} />
        </div>
      )}
    </div>
  );
}

function RecentTx({ tx }: { tx: ReturnType<typeof useViaX.getState>["transactions"] }) {
  return (
    <div className="surface-card overflow-hidden p-0">
      <div className="border-b px-4 py-3 text-sm font-medium">Transações</div>
      <ul>
        {tx.map((t) => {
          const positive = ["deposit", "payout", "refund", "bonus"].includes(t.type);
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0"
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border",
                  positive
                    ? "border-up/30 bg-up/10 text-up"
                    : "border-down/30 bg-down/10 text-down",
                )}
              >
                {positive ? (
                  <ArrowDownLeft className="size-4" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
              </span>
              <div className="flex-1">
                <div className="text-sm capitalize">
                  {labelTx(t.type)}
                  {t.market ? ` · ${t.market}` : ""}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(t.time, { locale: ptBR, addSuffix: true })}
                </div>
              </div>
              <div className={cn("mono text-sm", positive ? "text-up" : "text-down")}>
                {positive ? "+" : "-"}
                {formatBRL(t.amount)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function labelTx(t: string) {
  return (
    {
      deposit: copy.wallet.deposit,
      withdraw: copy.wallet.withdraw,
      entry: copy.wallet.entry,
      payout: copy.wallet.payout,
      refund: copy.wallet.refund,
      loss: "Derrota",
      bonus: "Bônus",
    }[t] ?? t
  );
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="surface-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
