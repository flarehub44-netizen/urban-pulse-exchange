import { createFileRoute } from "@tanstack/react-router";
import { useViaX } from "@/store/viax-store";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { formatBRL, formatPct, probability } from "@/lib/parimutuel";
import { Brain, CheckCircle2, XCircle } from "lucide-react";
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/urbanmind")({
  head: () => ({ meta: [{ title: "UrbanMind AI · ViaX" }, { name: "description", content: "A IA de visão computacional da ViaX para previsões urbanas em tempo real." }] }),
  component: UrbanMind,
});

function UrbanMind() {
  const markets = useViaX((s) => s.markets);
  const aiAcc = useViaX((s) => s.aiAccuracy);
  const top = markets[0];
  const history = Array.from({ length: 12 }, (_, i) => ({
    m: markets[i % markets.length].region,
    hit: i % 4 !== 3,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-card/30 p-6 backdrop-blur">
        <div className="flex items-center gap-2 text-primary">
          <Brain className="size-5" />
          <span className="text-xs uppercase tracking-wider">UrbanMind AI</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          Previsão ativa: <span className="text-gradient">{top.aiPrediction.value.toLocaleString("pt-BR")}</span> carros na {top.region}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A UrbanMind sinaliza <span className={`mono font-medium ${top.aiPrediction.side === "YES" ? "text-up" : "text-down"}`}>{top.aiPrediction.side === "YES" ? "SIM" : "NÃO"}</span> para o mercado entre 18h–19h com base em 14 dias de dados de fluxo, clima e padrões históricos.
        </p>
        <div className="mt-6 grid max-w-2xl grid-cols-3 gap-3">
          <KPI label="Confiança" value={<><AnimatedNumber value={top.aiPrediction.confidence * 100} decimals={1} />%</>} tone="primary" />
          <KPI label="Probabilidade SIM agora" value={<><AnimatedNumber value={probability(top.pool, "YES") * 100} decimals={1} />%</>} />
          <KPI label="Spread IA × mercado" value={<>{formatPct(Math.abs(top.aiPrediction.confidence - probability(top.pool, top.aiPrediction.side)))}</>} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Accuracy IA × comunidade · 30 dias</h2>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider">
              <span className="text-primary">● UrbanMind</span>
              <span className="text-muted-foreground">● Comunidade</span>
            </div>
          </div>
          <div className="mt-3" style={{ width: "100%", height: 280 }}>
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

        <div className="space-y-4">
          <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
            <h2 className="mb-3 text-sm font-medium">Previsões ativas</h2>
            <ul className="space-y-2">
              {markets.slice(0, 5).map((m) => (
                <li key={m.id} className="flex items-center justify-between rounded-lg border bg-surface/50 p-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{m.region}</div>
                    <div className="text-[11px] text-muted-foreground">Alvo {m.aiPrediction.value.toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="text-right">
                    <div className={`mono ${m.aiPrediction.side === "YES" ? "text-up" : "text-down"}`}>{m.aiPrediction.side}</div>
                    <div className="mono text-[11px] text-primary">{(m.aiPrediction.confidence*100).toFixed(0)}%</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
            <h2 className="mb-3 text-sm font-medium">Histórico recente</h2>
            <ul className="space-y-1.5 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between rounded-md border bg-surface/50 px-3 py-2">
                  <span>{h.m}</span>
                  {h.hit
                    ? <span className="inline-flex items-center gap-1 text-up text-xs"><CheckCircle2 className="size-3.5" /> hit</span>
                    : <span className="inline-flex items-center gap-1 text-down text-xs"><XCircle className="size-3.5" /> miss</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "primary" }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "primary" ? "border-primary/40 bg-primary/15" : "bg-card/40"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold mono ${tone === "primary" ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
