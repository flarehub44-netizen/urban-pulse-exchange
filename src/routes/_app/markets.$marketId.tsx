import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useEffect, useState } from "react";
import { useMarketHistory } from "@/hooks/use-market-history";
import { useMarketsList } from "@/hooks/use-markets";
import { useResolvedFeedForMarket } from "@/hooks/use-resolved-data";

const ProbChart = lazy(() =>
  import("@/components/viax/prob-chart").then((m) => ({ default: m.ProbChart })),
);
const MarketVolumeChart = lazy(() =>
  import("@/components/viax/market-volume-chart").then((m) => ({ default: m.MarketVolumeChart })),
);
import { MarketCandles } from "@/components/viax/market-candles";
import { SocialBook } from "@/components/viax/social-book";
import { OrderBox } from "@/components/viax/order-box";
import { AnonAccountBanner } from "@/components/viax/anon-account-banner";
import { OpenPositionStrip } from "@/components/viax/open-position-strip";
import { EdgeBadge } from "@/components/viax/edge-badge";
import { ProbBar } from "@/components/viax/prob-bar";
import { useCasinoEnabled } from "@/hooks/use-casino-enabled";
import { getMarketEdge } from "@/lib/market-edge";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { Countdown } from "@/components/viax/countdown";
import { copy } from "@/copy/pt-BR";
import { formatBRL, formatCompact, poolTotal, prizePool, probability } from "@/lib/parimutuel";
import { ArrowLeft, Brain, Users, MapPin, Activity, BarChart2, Scale } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { isSettledDisplay, statusLabel } from "@/lib/market-status";
import { MarketAuditPanel } from "@/components/viax/market-audit-panel";
import { MarketSocialProof } from "@/components/viax/market-social-proof";

export type MarketDetailSearch = {
  tab?: "chart" | "book" | "comments" | "audit";
  side?: "YES" | "NO";
};

export const Route = createFileRoute("/_app/markets/$marketId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.marketId} · ViaX` },
      {
        name: "description",
        content: copy.markets.detailMeta,
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): MarketDetailSearch => {
    const tab = search.tab;
    const validTab =
      tab === "chart" || tab === "book" || tab === "comments" || tab === "audit" ? tab : undefined;
    const side = search.side === "YES" || search.side === "NO" ? search.side : undefined;
    return { tab: validTab, side };
  },
  component: MarketDetail,
});

const tabs = [
  { key: "chart" as const, label: "Gráfico" },
  { key: "book" as const, label: copy.markets.tabBook },
  { key: "comments" as const, label: "Comentários" },
  { key: "audit" as const, label: copy.markets.tabAudit },
];

function MarketCommentsPanel({ marketId }: { marketId: string }) {
  const { feed } = useResolvedFeedForMarket(marketId);
  return (
    <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Comentários da comunidade</div>
        <span className="text-xs text-muted-foreground">{feed.length} posts</span>
      </div>
      <div className="mt-3 space-y-3">
        {feed.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Seja o primeiro a comentar este mercado.
          </p>
        )}
        {feed.map((p) => (
          <div
            key={p.id}
            className="flex gap-3 border-t border-border/60 pt-3 first:border-0 first:pt-0"
          >
            <img
              src={p.user.avatar}
              className="size-9 rounded-full bg-surface"
              alt={p.user.name}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{p.user.name}</span> @{p.user.handle}{" "}
                · {formatDistanceToNow(p.time, { locale: ptBR, addSuffix: true })}
              </div>
              <p className="mt-1 text-sm">{p.text}</p>
            </div>
          </div>
        ))}
      </div>
      <Link to="/feed" className="mt-4 inline-block text-xs text-primary hover:underline">
        Ver feed completo →
      </Link>
    </div>
  );
}

function MarketDetail() {
  const { enabled: casinoEnabled } = useCasinoEnabled();
  const { marketId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/_app/markets/$marketId" });
  const activeTab = search.tab ?? "book";
  const initialSide = search.side ?? undefined;
  const [showSocialBook, setShowSocialBook] = useState(false);

  const { markets, isLoading: marketsLoading } = useMarketsList();
  const m = markets.find((x) => x.id === marketId);
  const { data: dbHistory } = useMarketHistory(marketId);
  const history = useMemo(() => {
    if (dbHistory?.length) return dbHistory;
    return m?.history ?? [];
  }, [dbHistory, m?.history]);

  useEffect(() => {
    if (!m) return;
    const short = m.question.length > 42 ? `${m.question.slice(0, 42)}…` : m.question;
    document.title = `${short} · ViaX`;
  }, [m?.question]);

  useEffect(() => {
    if (activeTab !== "book") {
      setShowSocialBook(false);
      return;
    }
    const id = requestAnimationFrame(() => setShowSocialBook(true));
    return () => {
      cancelAnimationFrame(id);
      setShowSocialBook(false);
    };
  }, [activeTab, marketId]);

  if (marketsLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-surface-2" />
        <div className="h-40 rounded-2xl bg-surface-2" />
        <div className="h-64 rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (!m) throw notFound();

  const pY = probability(m.pool, "YES");
  const marketEdge = getMarketEdge(m);
  const showHotZone = casinoEnabled && Math.abs(marketEdge.edgePp) >= 8;
  const total = poolTotal(m.pool);
  const questionShort = m.question.length > 48 ? `${m.question.slice(0, 48)}…` : m.question;

  const setTab = (tab: MarketDetailSearch["tab"]) => {
    navigate({ search: (prev) => ({ ...prev, tab }), replace: true });
  };

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link to="/markets" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-4" /> Mercados
        </Link>
        <span className="text-muted-foreground/40">›</span>
        <Link
          to="/markets"
          search={{ region: m.region.split(" · ")[0] }}
          className="hover:text-foreground"
        >
          {m.region.split(" · ")[0]}
        </Link>
        <span className="text-muted-foreground/40">›</span>
        <span className="truncate text-foreground/80 max-w-[200px] md:max-w-md">
          {questionShort}
        </span>
      </nav>

      <AnonAccountBanner />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
          {m.category}
        </span>
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <MapPin className="size-3" />
          {m.region}
        </span>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider",
            isSettledDisplay(m.status)
              ? "border-warn/30 bg-warn/10 text-warn"
              : m.status === "dispute"
                ? "border-down/30 bg-down/10 text-down"
                : m.status === "resolving" || m.status === "closed"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-surface/60 text-muted-foreground",
          )}
        >
          {statusLabel(m.status)}
        </span>
        <EdgeBadge m={m} />
        <Link
          to="/urbanmind"
          search={{ marketId: m.id }}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Brain className="size-3" /> UrbanMind
        </Link>
      </div>

      <OpenPositionStrip marketId={marketId} />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5 min-w-0">
          <div className="surface-card">
            <h1 className="heading-page text-xl leading-snug md:text-2xl">
              {m.question.includes(m.region) ? (
                <>
                  {m.question.slice(0, m.question.indexOf(m.region))}
                  <span className="text-highlight">{m.region}</span>
                  {m.question.slice(m.question.indexOf(m.region) + m.region.length)}
                </>
              ) : (
                m.question
              )}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>
                Encerra em <Countdown to={m.endsAt} className="text-foreground" />
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" /> {formatCompact(m.participants)}{" "}
                {copy.markets.participants}
              </span>
              <span>
                {copy.markets.poolTotal}{" "}
                <span className="mono text-foreground">{formatBRL(total)}</span>
              </span>
              <span>
                {copy.markets.prizeTotal}{" "}
                <span className="mono text-foreground">{formatBRL(prizePool(m.pool))}</span>
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="glass-strong rounded-xl border border-up/30 bg-up/5 p-3 shadow-[var(--shadow-glow-up)]">
                <div className="text-xs uppercase tracking-wider text-up">↑ SIM</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-up mono">{(pY * 100).toFixed(1)}</span>
                  <span className="text-sm text-up/70">%</span>
                </div>
                <div className="mt-1 text-[11px] mono text-muted-foreground">
                  {formatBRL(m.pool.YES)}
                </div>
              </div>
              <div className="glass-strong rounded-xl border border-down/30 bg-down/5 p-3 shadow-[var(--shadow-glow-down)]">
                <div className="text-xs uppercase tracking-wider text-down">↓ NÃO</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-down mono">{((1 - pY) * 100).toFixed(1)}</span>
                  <span className="text-sm text-down/70">%</span>
                </div>
                <div className="mt-1 text-[11px] mono text-muted-foreground">
                  {formatBRL(m.pool.NO)}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <ProbBar yes={m.pool.YES} no={m.pool.NO} showHotZone={showHotZone} key={marketId} />
            </div>

            {(m.status === "live" || m.status === "closing") && (
              <div className="mt-4">
                {/* MarketSocialProof disabled: framer-motion ticker caused update loop with realtime pool */}
              </div>
            )}

            {m.status === "resolving" && (
              <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs">
                <div className="flex items-center gap-2 text-primary">
                  <Activity className="size-3 animate-pulse" />
                  <span>Oracle coletando dados…</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  IA confiança:{" "}
                  <span className="mono">{(m.aiPrediction.confidence * 100).toFixed(0)}%</span> ·
                  Previsão:{" "}
                  <span className={m.aiPrediction.side === "YES" ? "text-up" : "text-down"}>
                    {m.aiPrediction.side === "YES" ? "↑ SIM" : "↓ NÃO"}
                  </span>
                </p>
              </div>
            )}

            {m.status === "dispute" && (
              <div className="mt-3 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-xs">
                <div className="flex items-center gap-2 text-warn">
                  <Scale className="size-3" />
                  <span>Em disputa — aguardando revisão admin</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Ver aba{" "}
                  <button
                    type="button"
                    onClick={() => setTab("audit")}
                    className="text-primary underline"
                  >
                    Auditoria
                  </button>{" "}
                  para detalhes dos checks de validação.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-1 rounded-xl border bg-card/40 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition",
                  activeTab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "chart" && (
            <>
              <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="size-4 text-primary" /> Probabilidade ao vivo
                  </div>
                  <div className="flex items-center gap-3 text-xs uppercase tracking-wider">
                    <span className="text-up">● SIM</span>
                    <span className="text-down">● NÃO</span>
                  </div>
                </div>
                <div className="mt-3">
                  <Suspense fallback={<div className="h-[280px] animate-pulse rounded-xl bg-surface-2" />}>
                    <ProbChart m={m} history={history} />
                  </Suspense>
                </div>
                <div className="mt-4 border-t border-border/60 pt-4">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <BarChart2 className="size-3.5" /> Volume · barras
                  </div>
                  <Suspense fallback={<div className="h-[120px] animate-pulse rounded-xl bg-surface-2" />}>
                    <MarketVolumeChart history={history} />
                  </Suspense>
                </div>
                <div className="mt-4 border-t border-border/60 pt-4">
                  <div className="mb-2 text-xs text-muted-foreground">
                    {copy.markets.candlesNote}
                  </div>
                  <MarketCandles history={history} />
                </div>
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                <div className="flex items-center gap-2 text-primary">
                  <Brain className="size-4" />
                  <span className="text-xs uppercase tracking-wider">UrbanMind AI · Análise</span>
                </div>
                <p className="mt-2">
                  UrbanMind prevê{" "}
                  <span className="mono text-foreground">
                    {m.aiPrediction.value.toLocaleString("pt-BR")}
                  </span>{" "}
                  · sinaliza{" "}
                  <span
                    className={cn(
                      "mono font-medium",
                      m.aiPrediction.side === "YES" ? "text-up" : "text-down",
                    )}
                  >
                    {m.aiPrediction.side === "YES" ? "SIM" : "NÃO"}
                  </span>{" "}
                  com{" "}
                  <span className="mono text-primary">
                    {(m.aiPrediction.confidence * 100).toFixed(0)}%
                  </span>{" "}
                  de confiança.
                </p>
              </div>
            </>
          )}

          {activeTab === "comments" && <MarketCommentsPanel marketId={marketId} />}

          {activeTab === "audit" && (
            <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
              <MarketAuditPanel marketId={marketId} />
            </div>
          )}
        </div>

        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <OrderBox
            m={m}
            initialSide={initialSide}
            className="max-lg:sticky max-lg:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] max-lg:z-20 max-lg:shadow-[var(--shadow-elevated)]"
          />
          {showSocialBook && activeTab === "book" && <SocialBook m={m} />}
        </div>
      </div>
    </div>
  );
}
