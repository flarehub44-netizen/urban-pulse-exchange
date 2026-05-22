import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useResolvedMarkets } from "@/hooks/use-resolved-data";
import { useViaX } from "@/store/viax-store";
import type { Market, Side } from "@/store/viax-store";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { OrderBox } from "@/components/viax/order-box";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { copy } from "@/copy/pt-BR";
import { formatBRL, formatPct, probability } from "@/lib/parimutuel";
import { EdgeBadge } from "@/components/viax/edge-badge";
import { getMarketEdge } from "@/lib/market-edge";
import { Brain, Clock, Zap } from "lucide-react";
import { UrbanMindDigestCard } from "@/components/viax/urbanmind-digest-card";
import { useUrbanMindDigest } from "@/hooks/use-urbanmind-digest";
import { coachContinuityLine } from "@/lib/urbanmind-coach";
import { SurfaceCard } from "@/components/viax/surface-card";
import { KpiTile } from "@/components/viax/kpi-tile";
const UrbanMindAccuracyChart = lazy(() =>
  import("@/components/viax/urbanmind-accuracy-chart").then((m) => ({
    default: m.UrbanMindAccuracyChart,
  })),
);

export type UrbanMindSearch = { marketId?: string };

export const Route = createFileRoute("/_app/urbanmind")({
  head: () => ({
    meta: [
      { title: "UrbanMind AI · ViaX" },
      {
        name: "description",
        content: "A IA de visão computacional da ViaX para previsões urbanas em tempo real.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): UrbanMindSearch => ({
    marketId: typeof search.marketId === "string" && search.marketId ? search.marketId : undefined,
  }),
  component: UrbanMind,
});

function UrbanMind() {
  const navigate = useNavigate();
  const { marketId: marketIdFromUrl } = Route.useSearch();
  const { markets } = useResolvedMarkets();
  const aiAcc = useViaX((s) => s.aiAccuracy);
  const { data: digest } = useUrbanMindDigest();
  const coachLine = coachContinuityLine(digest);
  const top =
    (marketIdFromUrl ? markets.find((m) => m.id === marketIdFromUrl) : undefined) ??
    markets.find((m) => m.status === "live" || m.status === "closing") ??
    markets[0];
  const [betTarget, setBetTarget] = useState<{ market: Market; side: Side } | null>(null);
  const accuracyData = useMemo(
    () =>
      aiAcc.map((d) => ({
        t: new Date(d.t).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        AI: +(d.ai * 100).toFixed(1),
        H: +(d.human * 100).toFixed(1),
      })),
    [aiAcc],
  );

  if (!top) {
    return (
      <div className="rounded-2xl border bg-card/60 p-8 text-center text-muted-foreground">
        Nenhum mercado carregado.{" "}
        <Link to="/markets" search={{ status: "live" }} className="text-primary hover:underline">
          Ver mercados ao vivo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UrbanMindDigestCard />
      <SurfaceCard variant="featured" className="bg-gradient-to-br from-primary/10 via-card/60 to-card/30 p-6">
        <div className="flex items-center gap-2 text-primary">
          <Brain className="size-5" />
          <span className="text-xs uppercase tracking-wider">UrbanMind AI</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <EdgeBadge m={top} />
          {marketIdFromUrl && (
            <Link
              to="/markets/$marketId"
              params={{ marketId: top.id }}
              className="text-xs text-primary hover:underline"
            >
              Ver mercado →
            </Link>
          )}
        </div>
        <h1 className="heading-page mt-2 text-3xl md:text-4xl">
          <span className="text-highlight">Previsão ativa</span>:{" "}
          <span className="text-gradient">{top.aiPrediction.value.toLocaleString("pt-BR")}</span>{" "}
          carros na <span className="text-highlight">{top.region}</span>
        </h1>
        {coachLine && (
          <p className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            {coachLine}
          </p>
        )}
        <p className="text-lead mt-2 max-w-2xl">
          A UrbanMind sinaliza{" "}
          <span
            className={`mono text-emphasis ${top.aiPrediction.side === "YES" ? "text-up" : "text-down"}`}
          >
            {top.aiPrediction.side === "YES" ? "SIM" : "NÃO"}
          </span>{" "}
          para o mercado entre{" "}
          <span className="text-emphasis">18h–19h</span> com base em{" "}
          <span className="text-emphasis">14 dias</span> de dados de fluxo, clima e padrões
          históricos.
        </p>
        <div className="mt-6 grid max-w-2xl grid-cols-3 gap-3">
          <KpiTile
            embedded
            label="Confiança"
            tone="primary"
            value={
              <>
                <AnimatedNumber value={top.aiPrediction.confidence * 100} decimals={1} />%
              </>
            }
          />
          <KpiTile
            embedded
            label="Probabilidade SIM agora"
            value={
              <>
                <AnimatedNumber value={probability(top.pool, "YES") * 100} decimals={1} />%
              </>
            }
          />
          <KpiTile embedded label={copy.ia.edgeLabel} value={<>{getMarketEdge(top).label}</>} />
        </div>
      </SurfaceCard>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <SurfaceCard>
          <div className="flex items-center justify-between">
            <h2 className="heading-section">
              Precisão da <span className="text-highlight">IA</span> e da comunidade · 30 dias
            </h2>
            <div className="flex items-center gap-3 text-xs uppercase tracking-wider">
              <span className="text-primary">● UrbanMind</span>
              <span className="text-muted-foreground">● Comunidade</span>
            </div>
          </div>
          <Suspense
            fallback={<div className="mt-3 h-[280px] animate-pulse rounded-xl bg-surface/60" />}
          >
            <div className="mt-3">
              <UrbanMindAccuracyChart data={accuracyData} />
            </div>
          </Suspense>
        </SurfaceCard>

        <div className="space-y-4">
          <SurfaceCard className="p-4">
            <h2 className="heading-section mb-3">
              Previsões <span className="text-highlight">ativas</span>
            </h2>
            <ul className="space-y-2">
              {markets.slice(0, 5).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-surface/50 p-2.5 text-sm"
                >
                  <Link
                    to="/markets/$marketId"
                    params={{ marketId: m.id }}
                    className="min-w-0 flex-1 hover:text-primary"
                  >
                    <div className="truncate">{m.region}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Alvo {m.aiPrediction.value.toLocaleString("pt-BR")}
                    </div>
                  </Link>
                  <div className="text-right shrink-0">
                    <div
                      className={`mono ${m.aiPrediction.side === "YES" ? "text-up" : "text-down"}`}
                    >
                      {m.aiPrediction.side === "YES" ? "SIM" : "NÃO"}
                    </div>
                    <div className="mono text-[11px] text-primary">
                      {(m.aiPrediction.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBetTarget({ market: m, side: m.aiPrediction.side })}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary transition hover:bg-primary/20"
                  >
                    <Zap className="size-3" /> {copy.urbanmind.betWithIa}
                  </button>
                </li>
              ))}
            </ul>
          </SurfaceCard>

          <SurfaceCard className="p-4">
            <h2 className="heading-section mb-3">
              Histórico <span className="text-highlight">recente</span>
            </h2>
            <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
              <Clock className="size-7 opacity-30" />
              <p className="text-sm">Histórico sendo coletado</p>
              <p className="text-xs opacity-70">
                Os acertos e erros aparecerão aqui conforme os mercados forem resolvidos.
              </p>
            </div>
          </SurfaceCard>
        </div>
      </div>

      <Dialog
        open={betTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBetTarget(null);
        }}
      >
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-0">
            <div className="flex items-center gap-2 text-primary text-xs mb-1">
              <Brain className="size-3.5" /> UrbanMind AI recomenda
            </div>
            <DialogTitle className="text-sm font-medium leading-snug line-clamp-2">
              {betTarget?.market.question}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{betTarget?.market.region}</p>
          </DialogHeader>
          <div className="p-4">
            {betTarget && (
              <OrderBox
                m={betTarget.market}
                initialSide={betTarget.side}
                onSuccess={() => setBetTarget(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

