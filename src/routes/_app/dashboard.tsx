import { createFileRoute, Link } from "@tanstack/react-router";
import { useViaX } from "@/store/viax-store";
import { MarketCard } from "@/components/viax/market-card";
import { CityHeatmap } from "@/components/viax/city-heatmap";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { formatBRL, formatPct, prizePool, probability } from "@/lib/parimutuel";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, Brain, Flame, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Terminal · ViaX" }, { name: "description", content: "Painel ao vivo dos seus mercados, KPIs e UrbanMind AI." }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useViaX((s) => s.me);
  const markets = useViaX((s) => s.markets);
  const feed = useViaX((s) => s.feed);
  const top = [...markets].sort((a,b) => Math.abs(b.trend) - Math.abs(a.trend)).slice(0, 4);

  const pnlData = Array.from({ length: 30 }, (_, i) => ({
    d: i,
    pnl: 1200 + Math.sin(i / 4) * 220 + i * 28 + (Math.random() - 0.5) * 80,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bom pregão, {me.name.split(" ")[0]}.</h1>
            <p className="mt-1 text-sm text-muted-foreground">{markets.length} mercados ao vivo · UrbanMind AI confiança 78.4%</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI label="Saldo" value={<AnimatedNumber value={me.balance} format={formatBRL} />} />
          <KPI label="Lucro 24h" value={<span className="text-up"><AnimatedNumber value={me.pnl} format={formatBRL} /></span>} sub="+12.4% vs ontem" />
          <KPI label="Accuracy" value={<AnimatedNumber value={me.accuracy * 100} decimals={1} suffix="%" />} sub="Últimos 30 mercados" />
          <KPI label="Ranking" value={<span className="mono">#147</span>} sub="Top 1.3% global" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Mercados em alta</h2>
            <Link to="/markets" className="text-xs text-primary hover:underline">Ver todos →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {top.map((m) => <MarketCard key={m.id} m={m} />)}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Performance · 30d</h2>
            <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold mono text-up">+{formatBRL(2840)}</span>
                <span className="text-xs text-up">+18.4%</span>
              </div>
              <div style={{ width: "100%", height: 140 }}>
                <ResponsiveContainer>
                  <AreaChart data={pnlData}>
                    <defs>
                      <linearGradient id="pn" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-up)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-up)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="d" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="pnl" stroke="var(--color-up)" strokeWidth={1.6} fill="url(#pn)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Brain className="size-4" />
              <span className="text-xs uppercase tracking-wider">UrbanMind AI</span>
            </div>
            <p className="mt-2 text-sm">
              "UrbanMind prevê <span className="mono text-foreground">5.432 carros</span> na Av. Paulista entre 18h–19h, com <span className="mono text-primary">82%</span> de confiança."
            </p>
            <Link to="/urbanmind" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Abrir UrbanMind <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Feed</h2>
            <div className="space-y-2">
              {feed.slice(0, 4).map((p) => (
                <Link to="/feed" key={p.id} className="block rounded-xl border bg-card/60 p-3 backdrop-blur hover:bg-surface/60">
                  <div className="flex items-center gap-2">
                    <img src={p.user.avatar} className="size-7 rounded-full bg-surface" alt="" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">{p.user.name} <span className="text-muted-foreground">@{p.user.handle}</span></div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">{p.text}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(p.time, { locale: ptBR, addSuffix: false })}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Mapa da cidade</h2>
          <CityHeatmap height={360} />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Suas posições abertas</h2>
          <div className="space-y-2">
            {markets.slice(0, 5).map((m) => {
              const p = probability(m.pool, "YES");
              const side = p > 0.5 ? "YES" : "NO";
              return (
                <div key={m.id} className="rounded-xl border bg-card/60 p-3 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{m.region}</div>
                      <div className="text-[11px] text-muted-foreground">Prize Pool {formatBRL(prizePool(m.pool))}</div>
                    </div>
                    <div className="text-right">
                      <div className={`mono text-sm ${side === "YES" ? "text-up" : "text-down"}`}>{side}</div>
                      <div className="mono text-[11px] text-muted-foreground">{(Math.max(p, 1-p) * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <TrendingUp className="size-3" /> {label}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
