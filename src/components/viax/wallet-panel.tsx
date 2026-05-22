import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useWalletDeposit, useWalletWithdraw } from "@/hooks/use-wallet-rpc";
import { useTransactions } from "@/hooks/use-transactions";
import { useBalanceSeries } from "@/hooks/use-balance-series";
import { useProfile } from "@/hooks/use-profile";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useViaX } from "@/store/viax-store";
import { useBets } from "@/hooks/use-bets";
import { useMarkets } from "@/hooks/use-markets";
import type { Market } from "@/store/viax-store";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { ArrowDownLeft, ArrowUpRight, Plus, Minus, Trophy } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { isOpenBetStatus } from "@/lib/market-status";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const tabs = ["Visão geral", "Histórico", "Depositar", "Sacar"] as const;
type WalletTab = (typeof tabs)[number];

export function WalletPanel({ embedded }: { embedded?: boolean }) {
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const zustandMe = useViaX((s) => s.me);
  const me = profile ?? zustandMe;
  const { data: dbTx } = useTransactions();
  const zustandTx = useViaX((s) => s.transactions);
  const tx = dbTx ?? zustandTx;
  const { data: bets } = useBets();
  const { data: dbMarkets } = useMarkets();
  const zustandMarkets = useViaX((s) => s.markets);
  const allMarkets = dbMarkets ?? zustandMarkets;
  const [tab, setTab] = useState<WalletTab>("Visão geral");
  const [betFilter, setBetFilter] = useState<"todos" | "wins" | "losses">("todos");
  const [walletAmount, setWalletAmount] = useState("200");
  const depositMut = useWalletDeposit();
  const withdrawMut = useWalletWithdraw();

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
          <h1 className="text-2xl font-semibold tracking-tight">Carteira</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldo, movimentações e histórico de apostas.
          </p>
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

      <div className="rounded-2xl border bg-card/60 p-3 backdrop-blur">
        <div style={{ width: "100%", height: 160 }}>
          <ResponsiveContainer>
            <AreaChart data={balanceCurve}>
              <defs>
                <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--color-primary)"
                strokeWidth={1.8}
                fill="url(#wg)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              tab === t
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-surface-2",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Visão geral" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
            <h3 className="text-sm font-medium">Atalhos</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTab("Depositar")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-up/40 bg-up/10 px-3 py-2.5 text-sm font-medium text-up hover:bg-up/20"
              >
                <Plus className="size-4" /> Depositar
              </button>
              <button
                type="button"
                onClick={() => setTab("Sacar")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-down/40 bg-down/10 px-3 py-2.5 text-sm font-medium text-down hover:bg-down/20"
              >
                <Minus className="size-4" /> Sacar
              </button>
            </div>
          </div>
          <RecentTx tx={tx.slice(0, 5)} />
        </div>
      )}

      {tab === "Histórico" && (
        <EnrichedHistory
          bets={bets ?? []}
          tx={tx}
          markets={allMarkets}
          betFilter={betFilter}
          setBetFilter={setBetFilter}
        />
      )}

      {(tab === "Depositar" || tab === "Sacar") && (
        <div className="mx-auto max-w-md rounded-2xl border bg-card/60 p-5 backdrop-blur">
          <h3 className="text-sm font-medium">
            {tab === "Depositar" ? "Adicionar saldo" : "Sacar para conta"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Saldo virtual de demonstração. Integração de pagamento real virá em breve.
          </p>
          <label className="mt-4 block text-xs uppercase tracking-wider text-muted-foreground">
            Valor
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border bg-surface px-3 py-2">
            <span className="text-muted-foreground">R$</span>
            <input
              type="number"
              min={1}
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              className="w-full bg-transparent mono text-lg outline-none"
            />
          </div>
          <button
            type="button"
            disabled={depositMut.isPending || withdrawMut.isPending}
            onClick={async () => {
              const amount = Number(walletAmount);
              if (!amount || amount <= 0) {
                toast.error("Informe um valor válido.");
                return;
              }
              try {
                if (tab === "Depositar") {
                  await depositMut.mutateAsync(amount);
                  toast.success(copy.wallet.deposit);
                } else {
                  await withdrawMut.mutateAsync(amount);
                  toast.success(copy.wallet.withdraw);
                }
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Operação falhou.");
              }
            }}
            className={cn(
              "mt-4 w-full rounded-xl px-4 py-3 font-medium disabled:opacity-50",
              tab === "Depositar" ? "bg-up text-up-foreground" : "bg-down text-down-foreground",
            )}
          >
            {tab === "Depositar" ? "Confirmar depósito" : "Confirmar saque"}
          </button>
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
              ? `Apostas (${resolved.length})`
              : f === "wins"
                ? `✓ Vitórias (${wins.length})`
                : `✗ Derrotas (${losses.length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="rounded-2xl border bg-card/60 p-8 text-center text-sm text-muted-foreground backdrop-blur">
          <Trophy className="mx-auto mb-3 size-7 opacity-30" />
          Nenhum resultado aqui ainda.
        </div>
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
                      Apostado: <span className="mono text-foreground">{formatBRL(b.stake)}</span>
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
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Movimentações
          </h3>
          <RecentTx tx={deposits} />
        </div>
      )}
    </div>
  );
}

function RecentTx({ tx }: { tx: ReturnType<typeof useViaX.getState>["transactions"] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card/60 backdrop-blur">
      <div className="border-b px-4 py-3 text-sm font-medium">Transações</div>
      <ul>
        {tx.map((t) => {
          const positive =
            t.type === "deposit" || t.type === "payout" || t.type === "refund";
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
    }[t] ?? t
  );
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
