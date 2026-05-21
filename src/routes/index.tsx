import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ArrowRight, Activity, Brain, Users, Map, BarChart3, Smartphone, Zap, Trophy, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { useViaX } from "@/store/viax-store";
import { useRealtimeTick } from "@/hooks/use-realtime-tick";
import { MarketCard } from "@/components/viax/market-card";
import { Ticker } from "@/components/viax/ticker";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { Sparkline } from "@/components/viax/sparkline";
import { CityHeatmap } from "@/components/viax/city-heatmap";
import { Logo } from "@/components/viax/sidebar";
import { DivisionBadge } from "@/components/viax/division-badge";
import { formatBRL, formatCompact, probability, prizePool } from "@/lib/parimutuel";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ViaX — Prediction Exchange de Inteligência Urbana" },
      { name: "description", content: "Preveja trânsito e fluxo urbano em tempo real competindo contra milhares de usuários e a UrbanMind AI. Pools parimutuel, ranking ao vivo, terminal premium." },
      { property: "og:title", content: "ViaX — Transforme movimento urbano em inteligência coletiva" },
      { property: "og:description", content: "Bolsa viva de previsões urbanas. Pools, odds, IA e leaderboards em tempo real." },
    ],
  }),
  component: Landing,
});

function Landing() {
  useRealtimeTick();
  const markets = useViaX((s) => s.markets);
  const traders = useViaX((s) => s.traders);
  const aiAcc = useViaX((s) => s.aiAccuracy);
  const totalVol = markets.reduce((a, m) => a + m.pool.YES + m.pool.NO, 0);
  const totalPart = markets.reduce((a, m) => a + m.participants, 0);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[640px] w-[1200px] -translate-x-1/2 bg-[var(--gradient-glow)]" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                <span className="size-1.5 rounded-full bg-primary animate-[pulse-glow_2s_ease-in-out_infinite]" />
                Prediction Exchange · Parimutuel · Tempo real
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="mt-6 text-5xl font-semibold leading-[1.04] tracking-tight md:text-6xl lg:text-7xl"
              >
                Transforme <span className="text-gradient">movimento urbano</span> em inteligência coletiva.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="mt-5 max-w-xl text-lg text-muted-foreground"
              >
                Preveja trânsito, fluxo e velocidade em tempo real competindo contra milhares de traders urbanos e a UrbanMind AI. Pools parimutuel transparentes. 90% distribuído entre vencedores.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Link to="/dashboard" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-5 py-3 font-medium text-primary-foreground shadow-[var(--shadow-glow-primary)] transition hover:brightness-110">
                  Entrar agora <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link to="/markets" className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 font-medium hover:bg-surface-2">
                  Ver mercados
                </Link>
                <Link to="/ranking" className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 font-medium hover:bg-surface-2">
                  Ver ranking
                </Link>
              </motion.div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
                <Stat label="Volume 24h" value={<AnimatedNumber value={totalVol} format={formatBRL} />} />
                <Stat label="Mercados ativos" value={<AnimatedNumber value={markets.length} />} />
                <Stat label="Traders online" value={<AnimatedNumber value={totalPart} format={formatCompact} />} />
              </div>
            </div>

            {/* Terminal mock */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <TerminalMock />
            </motion.div>
          </div>
        </div>
        <Ticker />
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader eyebrow="Como funciona" title="Da rua para o pregão, em segundos." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { i: Radio, t: "1. Evento criado", d: '"Mais de 5.200 carros passarão na Paulista entre 18h–19h?"' },
            { i: BarChart3, t: "2. Pools parimutuel", d: "Traders entram em SIM ou NÃO. Probabilidades mudam ao vivo." },
            { i: Brain, t: "3. UrbanMind resolve", d: "Visão computacional conta o fluxo real automaticamente." },
            { i: Trophy, t: "4. Prize Pool distribuído", d: "90% do pool dividido proporcionalmente entre os vencedores." },
          ].map(({ i: Icon, t, d }, k) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: k * 0.06 }}
              className="rounded-2xl border bg-card/60 p-5 backdrop-blur"
            >
              <div className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="mt-4 font-medium">{t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PREDICTION EXCHANGE */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHeader eyebrow="Prediction Exchange" title="Mercados parimutuel reais, não casa de apostas." />
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A plataforma nunca banca os mercados. Você opera contra outros traders, com probabilidades 100% derivadas do fluxo financeiro do próprio pool. Transparente, matemático, vivo.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {markets.slice(0, 6).map((m) => <MarketCard key={m.id} m={m} />)}
          </div>
          <div className="mt-8 text-center">
            <Link to="/markets" className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 font-medium hover:bg-surface-2">
              Ver todos os mercados <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* AI vs HUMANS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="UrbanMind AI" title="Sua leitura vs. a melhor IA urbana do país." align="left" />
            <p className="mt-4 max-w-xl text-muted-foreground">
              A UrbanMind processa câmeras, sensores e padrões históricos. Você joga com intuição, contexto e velocidade. Quem decidiu melhor essa semana?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <KPI label="Accuracy IA (30d)" value="78.4%" tone="primary" />
              <KPI label="Accuracy traders" value="64.1%" />
              <KPI label="Mercados resolvidos" value="12.482" />
              <KPI label="Volume movimentado" value="R$ 18.4M" />
            </div>
          </div>
          <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur shadow-[var(--shadow-elevated)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium">Accuracy IA vs Humanos · 30 dias</div>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-primary"><span className="size-2 rounded-full bg-primary" /> UrbanMind</span>
                <span className="flex items-center gap-1.5 text-muted-foreground"><span className="size-2 rounded-full bg-muted-foreground" /> Comunidade</span>
              </div>
            </div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={aiAcc.map((d) => ({ t: new Date(d.t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), AI: +(d.ai*100).toFixed(1), H: +(d.human*100).toFixed(1) }))}>
                  <XAxis dataKey="t" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={32} />
                  <YAxis domain={[50, 90]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="AI" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="H"  stroke="var(--color-muted-foreground)" strokeWidth={1.6} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE MAP */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHeader eyebrow="Mercados em tempo real" title="A cidade respira. O pregão também." />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <CityHeatmap height={460} />
            <div className="space-y-3">
              {markets.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border bg-card/60 p-3 backdrop-blur">
                  <Sparkline data={m.history.map((h) => h.p)} stroke={m.trend >= 0 ? "var(--color-up)" : "var(--color-down)"} width={84} height={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{m.region}</div>
                    <div className="text-[11px] text-muted-foreground">Prize Pool {formatBRL(prizePool(m.pool))}</div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-up">{(probability(m.pool, "YES") * 100).toFixed(1)}%</div>
                    <div className="mono text-[10px] text-down">{((1 - probability(m.pool, "YES")) * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* RANKINGS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader eyebrow="Rankings" title="Top traders urbanos · esta semana" />
        <div className="mt-10 overflow-hidden rounded-2xl border bg-card/60 backdrop-blur">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Trader</th>
                <th className="px-4 py-3 text-left">Divisão</th>
                <th className="px-4 py-3 text-right">Accuracy</th>
                <th className="hidden sm:table-cell px-4 py-3 text-right">ROI</th>
                <th className="hidden md:table-cell px-4 py-3 text-right">Volume</th>
                <th className="hidden md:table-cell px-4 py-3 text-right">Crescimento</th>
              </tr>
            </thead>
            <tbody>
              {traders.slice(0, 5).map((t, i) => (
                <tr key={t.id} className="border-t border-border/60 hover:bg-surface/40">
                  <td className="px-4 py-3 mono text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={t.avatar} className="size-8 rounded-full bg-surface" alt="" />
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground">@{t.handle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><DivisionBadge division={t.division} /></td>
                  <td className="px-4 py-3 text-right mono">{(t.accuracy * 100).toFixed(1)}%</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-right mono text-up">+{(t.roi * 100).toFixed(0)}%</td>
                  <td className="hidden md:table-cell px-4 py-3 text-right mono">{formatBRL(t.volume)}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-right mono">
                    <span className={t.weeklyGrowth >= 0 ? "text-up" : "text-down"}>
                      {t.weeklyGrowth >= 0 ? "▲" : "▼"} {(Math.abs(t.weeklyGrowth) * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-6 py-16 md:grid-cols-4">
          {[
            { l: "Volume diário", v: <AnimatedNumber value={totalVol} format={formatBRL} />, i: Activity },
            { l: "Mercados ao vivo", v: <AnimatedNumber value={markets.length} />, i: Radio },
            { l: "Accuracy IA", v: "78.4%", i: Brain },
            { l: "Traders ativos", v: <AnimatedNumber value={totalPart} format={formatCompact} />, i: Users },
          ].map((s, i) => {
            const Icon = s.i;
            return (
              <div key={i} className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
                <Icon className="size-4 text-primary" />
                <div className="mt-3 text-2xl font-semibold">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MOBILE */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Mobile experience" title="O pregão no seu bolso." align="left" />
            <p className="mt-4 max-w-xl text-muted-foreground">
              Inspirado em Robinhood, Polymarket e na fluidez de apps de trading. Swipe entre mercados, opere com dois toques, acompanhe a cidade em tempo real.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Bottom navigation com 5 atalhos", "Cards full-width com swipe", "Animações 60 fps", "Notificações inteligentes"].map((f) => (
                <li key={f} className="flex items-center gap-2"><Zap className="size-4 text-primary" /> {f}</li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto flex w-full max-w-sm justify-center">
            <PhoneMock />
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span>ViaX · Inteligência urbana em tempo real</span>
          </div>
          <div className="flex gap-5">
            <Link to="/markets">Mercados</Link>
            <Link to="/ranking">Ranking</Link>
            <Link to="/urbanmind">UrbanMind</Link>
            <Link to="/dashboard">Terminal</Link>
          </div>
        </div>
      </footer>

      <Outlet />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold tracking-tight">ViaX</span>
        </Link>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/markets" className="hover:text-foreground">Mercados</Link>
          <Link to="/live" className="hover:text-foreground">Mapa</Link>
          <Link to="/ranking" className="hover:text-foreground">Ranking</Link>
          <Link to="/urbanmind" className="hover:text-foreground">UrbanMind</Link>
          <Link to="/feed" className="hover:text-foreground">Feed</Link>
        </nav>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Abrir terminal <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card/60 p-3 backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
function KPI({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "primary" ? "border-primary/40 bg-primary/10" : "bg-card/60"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold mono ${tone === "primary" ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
function SectionHeader({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <div className="text-xs uppercase tracking-[0.18em] text-primary">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
    </div>
  );
}

function TerminalMock() {
  const markets = useViaX((s) => s.markets);
  const top = markets[0];
  return (
    <div className="rounded-2xl border bg-card/70 p-1 shadow-[var(--shadow-elevated)] backdrop-blur">
      <div className="rounded-xl bg-gradient-to-br from-surface/80 to-surface-2/40 p-5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-up animate-[pulse-glow_2s_ease-in-out_infinite]" /> Live · ViaX Terminal</span>
          <span className="mono">PAULISTA · 18h–19h</span>
        </div>
        <div className="mt-3 text-lg font-medium">{top.question}</div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-up/30 bg-up/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-up">SIM</div>
            <div className="mt-1 text-3xl font-semibold mono text-up">
              <AnimatedNumber value={probability(top.pool, "YES") * 100} decimals={1} />%
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground mono">{formatBRL(top.pool.YES)}</div>
          </div>
          <div className="rounded-xl border border-down/30 bg-down/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-down">NÃO</div>
            <div className="mt-1 text-3xl font-semibold mono text-down">
              <AnimatedNumber value={(1 - probability(top.pool, "YES")) * 100} decimals={1} />%
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground mono">{formatBRL(top.pool.NO)}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border bg-background/40 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Probabilidade · 40 min</span>
            <span className="mono text-foreground">Prize Pool {formatBRL(prizePool(top.pool))}</span>
          </div>
          <Sparkline data={top.history.map((h) => h.p)} width={420} height={64} stroke="var(--color-primary)" />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span><Map className="inline size-3" /> {top.region}</span>
          <span>UrbanMind <span className="text-primary mono">{(top.aiPrediction.confidence * 100).toFixed(0)}%</span> · {top.aiPrediction.side}</span>
        </div>
      </div>
    </div>
  );
}

function PhoneMock() {
  const markets = useViaX((s) => s.markets);
  return (
    <div className="relative h-[520px] w-[260px] rounded-[44px] border border-border bg-surface/80 p-3 shadow-[var(--shadow-elevated)]">
      <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-background" />
      <div className="h-full w-full overflow-hidden rounded-[36px] bg-background">
        <div className="border-b px-4 pb-2 pt-7 text-[10px] uppercase tracking-wider text-muted-foreground">Mercados ao vivo</div>
        <div className="space-y-2 p-3">
          {markets.slice(0, 4).map((m) => {
            const p = probability(m.pool, "YES");
            return (
              <div key={m.id} className="rounded-xl border bg-card/60 p-3">
                <div className="text-[10px] text-muted-foreground">{m.region}</div>
                <div className="mt-1 line-clamp-2 text-[11px]">{m.question}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-up transition-all" style={{ width: `${p * 100}%` }} />
                  </div>
                  <span className="mono text-[10px] text-up">{(p*100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
