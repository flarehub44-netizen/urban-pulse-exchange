import { createFileRoute } from "@tanstack/react-router";
import { useViaX } from "@/store/viax-store";
import { DivisionBadge } from "@/components/viax/division-badge";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { formatBRL } from "@/lib/parimutuel";
import { Lock } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Perfil · ViaX" }, { name: "description", content: "Seu perfil, badges, divisão e histórico na ViaX." }] }),
  component: Profile,
});

const badges = [
  { name: "Mestre da Paulista", unlocked: true,  desc: "10 wins na Av. Paulista" },
  { name: "Rei do Rush",        unlocked: true,  desc: "5 wins entre 18h–19h" },
  { name: "Alpha Predictor",    unlocked: true,  desc: "Acertou contra IA 3x seguidas" },
  { name: "Traffic Sniper",     unlocked: true,  desc: "ROI > 100% em mercado" },
  { name: "Urban Oracle",       unlocked: false, desc: "Top 100 global" },
  { name: "Maratonista",        unlocked: false, desc: "30 mercados em 1 dia" },
  { name: "Marginal Master",    unlocked: false, desc: "10 wins na Marginal" },
  { name: "Volume Beast",       unlocked: false, desc: "R$ 50k movimentados" },
];

function Profile() {
  const me = useViaX((s) => s.me);

  const pnl = Array.from({ length: 60 }, (_, i) => ({
    d: i, v: 0 + i * 22 + Math.sin(i / 5) * 280 + (Math.random() - 0.5) * 80,
  }));

  // calendar grid 7x12
  const calendar = Array.from({ length: 84 }, () => Math.random());

  const xpPct = (me.xp / me.xpToNext) * 100;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card/60 to-card/40 p-6 backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <img src={me.avatar} className="size-20 rounded-2xl border bg-surface" alt="" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{me.name}</h1>
              <DivisionBadge division={me.division} />
            </div>
            <div className="text-sm text-muted-foreground">@{me.handle} · São Paulo · Pinheiros</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-gradient-to-r from-primary to-primary-glow shadow-[var(--shadow-glow-primary)]" style={{ width: `${xpPct}%` }} />
              </div>
              <span className="mono text-xs"><AnimatedNumber value={me.xp} /> / {me.xpToNext} XP</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI label="Accuracy" value={<><AnimatedNumber value={me.accuracy*100} decimals={1} />%</>} />
          <KPI label="ROI total" value={<span className="text-up"><AnimatedNumber value={me.roi*100} decimals={1} />%</span>} />
          <KPI label="Lucro acumulado" value={<AnimatedNumber value={me.pnl * 3.2} format={formatBRL} />} />
          <KPI label="Streak" value={<>🔥 {me.streak}</>} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
          <h2 className="text-sm font-medium">PnL · 60 dias</h2>
          <div className="mt-3" style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={pnl}>
                <defs>
                  <linearGradient id="pf" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-up)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-up)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="v" stroke="var(--color-up)" strokeWidth={1.8} fill="url(#pf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
          <h2 className="text-sm font-medium">Atividade · 12 semanas</h2>
          <div className="mt-4 grid grid-cols-12 gap-1">
            {calendar.map((v, i) => (
              <div key={i}
                className={cn(
                  "aspect-square rounded-[3px] transition",
                  v > 0.85 ? "bg-primary shadow-[var(--shadow-glow-primary)]" :
                  v > 0.6  ? "bg-primary/70" :
                  v > 0.35 ? "bg-primary/40" :
                  v > 0.15 ? "bg-primary/20" : "bg-surface-2"
                )}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Menos</span>
            <div className="flex gap-1">
              {[0.1, 0.3, 0.5, 0.8].map((o) => <span key={o} className="size-2 rounded-[2px] bg-primary" style={{ opacity: o }} />)}
            </div>
            <span>Mais</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Badges</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((b) => (
            <div key={b.name} className={cn(
              "rounded-2xl border p-4",
              b.unlocked ? "border-primary/40 bg-primary/10" : "border-border bg-card/40 opacity-60"
            )}>
              <div className="flex items-center justify-between">
                <div className={cn("size-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow", !b.unlocked && "grayscale")} />
                {!b.unlocked && <Lock className="size-3.5 text-muted-foreground" />}
              </div>
              <div className="mt-3 text-sm font-medium">{b.name}</div>
              <div className="text-[11px] text-muted-foreground">{b.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
