import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMarkets } from "@/hooks/use-markets";
import { useFeed } from "@/hooks/use-feed";
import { useViaX } from "@/store/viax-store";
import { ProbChart } from "@/components/viax/prob-chart";
import { OrderBox } from "@/components/viax/order-box";
import { ProbBar } from "@/components/viax/prob-bar";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { Countdown } from "@/components/viax/countdown";
import { formatBRL, formatCompact, formatPct, poolTotal, prizePool, probability } from "@/lib/parimutuel";
import { ArrowLeft, Brain, Users, MapPin, TrendingUp, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/markets/$marketId")({
  head: ({ params }) => ({ meta: [{ title: `${params.marketId} · ViaX` }, { name: "description", content: "Detalhe do mercado ViaX com odds em tempo real, painel parimutuel e UrbanMind AI." }] }),
  component: MarketDetail,
});

function MarketDetail() {
  const { marketId } = Route.useParams();
  const { data: dbMarkets } = useMarkets();
  const zustandMarkets = useViaX((s) => s.markets);
  const markets = dbMarkets ?? zustandMarkets;
  const m = markets.find((x) => x.id === marketId);
  const { data: dbFeed } = useFeed(marketId);
  const zustandFeed = useViaX((s) => s.feed.filter((p) => p.marketId === marketId));
  const feed = dbFeed ?? zustandFeed;
  if (!m) throw notFound();

  const pY = probability(m.pool, "YES");
  const total = poolTotal(m.pool);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-sm">
        <Link to="/markets" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Mercados</Link>
        <span className="text-muted-foreground/40">·</span>
        <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">{m.category}</span>
        <span className="text-muted-foreground inline-flex items-center gap-1"><MapPin className="size-3" />{m.region}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
            <h1 className="text-xl font-medium leading-snug md:text-2xl">{m.question}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>Encerra em <Countdown to={m.endsAt} className="text-foreground" /></span>
              <span className="inline-flex items-center gap-1"><Users className="size-3" /> {formatCompact(m.participants)} traders</span>
              <span>Pool total <span className="mono text-foreground">{formatBRL(total)}</span></span>
              <span>Prize Pool <span className="mono text-foreground">{formatBRL(prizePool(m.pool))}</span></span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-up/30 bg-up/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-up">SIM</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <AnimatedNumber value={pY * 100} decimals={1} className="text-3xl font-semibold text-up" />
                  <span className="text-sm text-up/70">%</span>
                </div>
                <div className="mt-1 text-[11px] mono text-muted-foreground">{formatBRL(m.pool.YES)}</div>
              </div>
              <div className="rounded-xl border border-down/30 bg-down/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-down">NÃO</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <AnimatedNumber value={(1-pY) * 100} decimals={1} className="text-3xl font-semibold text-down" />
                  <span className="text-sm text-down/70">%</span>
                </div>
                <div className="mt-1 text-[11px] mono text-muted-foreground">{formatBRL(m.pool.NO)}</div>
              </div>
            </div>

            <div className="mt-3">
              <ProbBar yes={m.pool.YES} no={m.pool.NO} />
            </div>
          </div>

          <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="size-4 text-primary" /> Probabilidade ao vivo
              </div>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider">
                <span className="text-up">● SIM</span><span className="text-down">● NÃO</span>
              </div>
            </div>
            <div className="mt-3">
              <ProbChart m={m} />
            </div>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-primary">
              <Brain className="size-4" />
              <span className="text-xs uppercase tracking-wider">UrbanMind AI · Análise</span>
            </div>
            <p className="mt-2">UrbanMind prevê <span className="mono text-foreground">{m.aiPrediction.value.toLocaleString("pt-BR")}</span> · sinaliza <span className={`mono font-medium ${m.aiPrediction.side === "YES" ? "text-up" : "text-down"}`}>{m.aiPrediction.side === "YES" ? "SIM" : "NÃO"}</span> com <span className="mono text-primary">{(m.aiPrediction.confidence * 100).toFixed(0)}%</span> de confiança.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Modelo treinado com 14 dias de fluxo + dados meteorológicos. Histórico de eventos da mesma faixa horária confirma a tendência.
            </p>
          </div>

          <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Comentários da comunidade</div>
              <span className="text-xs text-muted-foreground">{feed.length} posts</span>
            </div>
            <div className="mt-3 space-y-3">
              {feed.length === 0 && <p className="text-sm text-muted-foreground">Seja o primeiro a comentar este mercado.</p>}
              {feed.map((p) => (
                <div key={p.id} className="flex gap-3 border-t border-border/60 pt-3 first:border-0 first:pt-0">
                  <img src={p.user.avatar} className="size-9 rounded-full bg-surface" alt="" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{p.user.name}</span> @{p.user.handle} · {formatDistanceToNow(p.time, { locale: ptBR, addSuffix: true })}
                    </div>
                    <p className="mt-1 text-sm">{p.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <OrderBox m={m} />
          <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-sm"><TrendingUp className="size-4 text-primary" /> Pressão do book</div>
            <div className="mt-3 space-y-2 text-xs">
              {[1,2,3,4,5,6].map((i) => {
                const side = i % 2 === 0 ? "NO" : "YES";
                const value = Math.floor(Math.random() * 800) + 80;
                return (
                  <div key={i} className="flex items-center justify-between">
                    <span className={`mono ${side === "YES" ? "text-up" : "text-down"}`}>{side === "YES" ? "+SIM" : "+NÃO"}</span>
                    <span className="mono text-muted-foreground">{formatBRL(value)}</span>
                    <span className="text-muted-foreground">@{(Math.random() * 100).toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
