import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { useProfile } from "@/hooks/use-profile";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useViaX } from "@/store/viax-store";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { formatBRL } from "@/lib/parimutuel";
import { ArrowDownLeft, ArrowUpRight, Plus, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/wallet")({
  head: () => ({ meta: [{ title: "Carteira · ViaX" }, { name: "description", content: "Sua carteira ViaX: saldo, depósitos, saques e histórico de operações." }] }),
  component: Wallet,
});

const tabs = ["Visão geral", "Histórico", "Depositar", "Sacar"] as const;
type T = (typeof tabs)[number];

function Wallet() {
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const zustandMe = useViaX((s) => s.me);
  const me = profile ?? zustandMe;
  const { data: dbTx } = useTransactions();
  const zustandTx = useViaX((s) => s.transactions);
  const tx = dbTx ?? zustandTx;
  const [tab, setTab] = useState<T>("Visão geral");

  const balanceCurve = Array.from({ length: 30 }, (_, i) => ({
    d: i, v: 3200 + i * 35 + Math.sin(i / 3) * 180 + (Math.random() - 0.5) * 80,
  }));

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Saldo disponível</div>
        <div className="mt-1 flex items-baseline gap-3">
          <AnimatedNumber value={me.balance} format={formatBRL} className="text-4xl font-semibold tracking-tight md:text-5xl" />
          <span className="text-sm text-up">+{formatBRL(me.pnl)} (30d)</span>
        </div>
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
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="v" stroke="var(--color-primary)" strokeWidth={1.8} fill="url(#wg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI label="ROI total" value={<><AnimatedNumber value={me.roi * 100} decimals={1} suffix="%" className="text-up" /></>} />
        <KPI label="Volume movimentado" value={<AnimatedNumber value={184200} format={formatBRL} />} />
        <KPI label="Mercados operados" value={<AnimatedNumber value={142} />} />
        <KPI label="Streak ativa" value={<>🔥 {me.streak}</>} />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("rounded-full border px-3 py-1.5 text-xs",
              tab === t ? "border-primary/60 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:bg-surface-2")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Visão geral" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
            <h3 className="text-sm font-medium">Atalhos</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setTab("Depositar")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-up/40 bg-up/10 px-3 py-2.5 text-sm font-medium text-up hover:bg-up/20"><Plus className="size-4" /> Depositar</button>
              <button onClick={() => setTab("Sacar")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-down/40 bg-down/10 px-3 py-2.5 text-sm font-medium text-down hover:bg-down/20"><Minus className="size-4" /> Sacar</button>
            </div>
          </div>
          <RecentTx tx={tx.slice(0, 5)} />
        </div>
      )}

      {tab === "Histórico" && <RecentTx tx={tx} />}

      {(tab === "Depositar" || tab === "Sacar") && (
        <div className="mx-auto max-w-md rounded-2xl border bg-card/60 p-5 backdrop-blur">
          <h3 className="text-sm font-medium">{tab === "Depositar" ? "Adicionar saldo" : "Sacar para conta"}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Saldo virtual de demonstração. Integração de pagamento real virá em breve.</p>
          <label className="mt-4 block text-[10px] uppercase tracking-wider text-muted-foreground">Valor</label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border bg-surface px-3 py-2">
            <span className="text-muted-foreground">R$</span>
            <input type="number" defaultValue={200} className="w-full bg-transparent mono text-lg outline-none" />
          </div>
          <button className={cn("mt-4 w-full rounded-xl px-4 py-3 font-medium", tab === "Depositar" ? "bg-up text-up-foreground" : "bg-down text-down-foreground")}>
            {tab === "Depositar" ? "Confirmar depósito" : "Confirmar saque"}
          </button>
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
          const positive = t.type === "deposit" || t.type === "payout";
          return (
            <li key={t.id} className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0">
              <span className={cn("flex size-9 items-center justify-center rounded-full border", positive ? "border-up/30 bg-up/10 text-up" : "border-down/30 bg-down/10 text-down")}>
                {positive ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
              </span>
              <div className="flex-1">
                <div className="text-sm capitalize">{labelTx(t.type)}{t.market ? ` · ${t.market}` : ""}</div>
                <div className="text-[11px] text-muted-foreground">{formatDistanceToNow(t.time, { locale: ptBR, addSuffix: true })}</div>
              </div>
              <div className={cn("mono text-sm", positive ? "text-up" : "text-down")}>
                {positive ? "+" : "-"}{formatBRL(t.amount)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function labelTx(t: string) {
  return { deposit: "Depósito", withdraw: "Saque", entry: "Entrada em pool", payout: "Payout de mercado" }[t] ?? t;
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
