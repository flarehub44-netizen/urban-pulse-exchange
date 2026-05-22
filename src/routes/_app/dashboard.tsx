import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useEffect, useState, useRef, lazy, Suspense } from "react";
import { findTopMarketForRegion } from "@/lib/region-market";
import { toast } from "sonner";
import { useViaX } from "@/store/viax-store";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useBets } from "@/hooks/use-bets";
import { isOpenBetStatus } from "@/lib/market-status";
import {
  useResolvedProfile,
  useResolvedMarkets,
  useResolvedRegions,
  useResolvedTransactions,
  useResolvedTraders,
} from "@/hooks/use-resolved-data";
import { usePnlSeries } from "@/hooks/use-pnl-series";
import { MarketCard } from "@/components/viax/market-card";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { formatBRL, PRIZE_RATIO } from "@/lib/parimutuel";
import { useDeferredMount } from "@/hooks/use-deferred-mount";

const DashboardPnlChart = lazy(() =>
  import("@/components/viax/dashboard-pnl-chart").then((m) => ({ default: m.DashboardPnlChart })),
);
const CityHeatmap = lazy(() =>
  import("@/components/viax/city-heatmap").then((m) => ({ default: m.CityHeatmap })),
);
const SpinWheel = lazy(() =>
  import("@/components/viax/spin-wheel").then((m) => ({ default: m.SpinWheel })),
);
const UrbanMindDigestCard = lazy(() =>
  import("@/components/viax/urbanmind-digest-card").then((m) => ({
    default: m.UrbanMindDigestCard,
  })),
);
const WeeklyChallengeCard = lazy(() =>
  import("@/components/viax/weekly-challenge-card").then((m) => ({
    default: m.WeeklyChallengeCard,
  })),
);
const PrecisionReportCard = lazy(() =>
  import("@/components/viax/precision-report-card").then((m) => ({
    default: m.PrecisionReportCard,
  })),
);

function ChartFallback() {
  return <div className="h-[140px] animate-pulse rounded-xl bg-surface/60" />;
}
import { AnonAccountBanner } from "@/components/viax/anon-account-banner";
import { TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/viax/page-header";
import { KpiTile } from "@/components/viax/kpi-tile";
import { SurfaceCard } from "@/components/viax/surface-card";
import { useFollowedTraders } from "@/hooks/use-followed-traders";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { copy } from "@/copy/pt-BR";
import { EmptyState } from "@/components/viax/empty-state";
import { buildActionNowItems } from "@/lib/action-now";
import { buildDailyMission } from "@/lib/urbanmind-coach";
import { DEFAULT_FEATURED_MARKET_ID } from "@/config/markets";
import { DailyPulse } from "@/components/viax/daily-pulse";
import { StreakRiskBanner } from "@/components/viax/streak-risk-banner";
import { useCasinoEnabled } from "@/hooks/use-casino-enabled";
import { DailyMissions } from "@/components/viax/daily-missions";
import { WeeklyReportModal } from "@/components/viax/weekly-report-modal";
import { useWeeklyReport } from "@/hooks/use-weekly-report";
import { scheduleDailyPush } from "@/lib/push-scheduler";
import { EventsBanner } from "@/components/viax/events-banner";
import { TomorrowPreview } from "@/components/viax/tomorrow-preview";
import { NeighborhoodWidget } from "@/components/viax/neighborhood-widget";
import { DailyPoll } from "@/components/viax/daily-poll";
import { DivisionUpModal } from "@/components/viax/division-up-modal";

export type DashboardSearch = { from?: string; highlight?: "position" };

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: copy.dashboard.metaTitle },
      { name: "description", content: copy.dashboard.metaDescription },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    from: typeof search.from === "string" ? search.from : undefined,
    highlight: search.highlight === "position" ? "position" : undefined,
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate({ from: "/dashboard" });
  const deferredReady = useDeferredMount(150);
  const { enabled: casinoEnabled } = useCasinoEnabled();
  const { from, highlight } = Route.useSearch();
  const { userId } = useAnonAuth();
  const { me, profile: dbProfile } = useResolvedProfile();
  const { data: weeklyReport, shouldShow: showWeeklyReport } = useWeeklyReport();
  const [weeklyReportDismissed, setWeeklyReportDismissed] = useState(false);
  const [divisionUp, setDivisionUp] = useState<string | null>(null);
  const prevDivisionRef = useRef<string | null>(null);
  const { markets } = useResolvedMarkets();
  const { regions } = useResolvedRegions();
  const feed = useViaX((s) => s.feed);

  useEffect(() => {
    if (from === "landing") {
      toast.message(copy.dashboard.welcomeToast, {
        description: copy.dashboard.welcomeToastDesc,
      });
      navigate({ search: () => ({}), replace: true });
    }
  }, [from, navigate]);

  // Detectar subida de divisão e mostrar modal comemorativo
  useEffect(() => {
    if (!dbProfile?.division) return;
    const prev = prevDivisionRef.current;
    if (prev && prev !== dbProfile.division) {
      setDivisionUp(dbProfile.division);
    }
    prevDivisionRef.current = dbProfile.division;
  }, [dbProfile?.division]);

  // Agendar push notifications diárias (após primeiro paint)
  useEffect(() => {
    if (!deferredReady || !dbProfile) return;
    const liveCount = markets.filter((m) => m.status === "live" || m.status === "closing").length;
    scheduleDailyPush({
      name: dbProfile.name?.split(" ")[0] ?? "Analista",
      neighborhood: dbProfile.neighborhood ?? "",
      city: dbProfile.city ?? "São Paulo",
      streak: dbProfile.streak ?? 0,
      openMarkets: liveCount,
      multiplier: dbProfile.streakMultiplier ?? 1,
    });
  }, [dbProfile, markets, deferredReady]);

  useEffect(() => {
    if (highlight !== "position") return;
    const el = document.getElementById("open-positions");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    navigate({ search: (prev) => ({ ...prev, highlight: undefined }), replace: true });
  }, [highlight, navigate]);

  const { data: bets } = useBets();
  const openBets = (bets ?? []).filter((b) => isOpenBetStatus(b.marketStatus));
  const topOpen = openBets.slice(0, 3);

  const { transactions } = useResolvedTransactions();
  const pnlSeries = usePnlSeries(transactions);

  const { traders } = useResolvedTraders();
  const myRank = useMemo(() => {
    if (!userId || !traders.length) return null;
    const idx = traders.findIndex((t) => t.id === userId);
    return idx >= 0 ? idx + 1 : null;
  }, [traders, userId]);

  const { ids: followedIds } = useFollowedTraders();

  const liveCount = markets.filter((m) => m.status === "live" || m.status === "closing").length;
  const top = [...markets].sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend)).slice(0, 4);
  const urbanMindMarket = markets.find((m) => m.id === DEFAULT_FEATURED_MARKET_ID) ?? markets[0];
  const dailyMission = buildDailyMission(
    markets,
    dbProfile?.neighborhood ?? null,
    dbProfile?.city ?? "São Paulo",
  );
  const actionNow = buildActionNowItems(
    openBets,
    markets,
    urbanMindMarket,
    followedIds,
    traders,
    dailyMission,
  );

  const pnlTotal = pnlSeries.length ? pnlSeries[pnlSeries.length - 1].v : "pnl" in me ? me.pnl : 0;
  const pnlStart = pnlSeries.length > 1 ? pnlSeries[0].v : 0;
  const pnlDelta = pnlTotal - pnlStart;
  const pnlPct = pnlStart !== 0 ? ((pnlDelta / Math.abs(pnlStart)) * 100).toFixed(1) : null;

  const chartData = pnlSeries.length
    ? pnlSeries.map((p) => ({ d: p.label, pnl: p.v }))
    : [{ d: "—", pnl: 0 }];

  return (
    <div className="space-y-6">
      {/* Weekly Pulse Report — segunda-feira */}
      {deferredReady && showWeeklyReport && !weeklyReportDismissed && weeklyReport && (
        <WeeklyReportModal report={weeklyReport} onClose={() => setWeeklyReportDismissed(true)} />
      )}

      {/* Division-up celebration */}
      <DivisionUpModal newDivision={divisionUp} onClose={() => setDivisionUp(null)} />

      <AnonAccountBanner />
      <EventsBanner />
      <StreakRiskBanner />

      <div className="page-section">
        <PageHeader
          title={
            <>
              Olá, <span className="text-highlight">{me.name.split(" ")[0]}</span>.
            </>
          }
          description={
            <>
              <span className="text-emphasis">{liveCount} mercados</span> ao vivo
              {urbanMindMarket ? (
                <>
                  {" "}
                  · UrbanMind confiança{" "}
                  <span className="text-emphasis">
                    {(urbanMindMarket.aiPrediction.confidence * 100).toFixed(0)}%
                  </span>
                </>
              ) : null}
            </>
          }
        />

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link to="/profile" search={{ tab: "carteira" }}>
            <KpiTile
              label="Saldo"
              icon={TrendingUp}
              value={<AnimatedNumber value={me.balance} format={formatBRL} />}
              interactive
            />
          </Link>
          <Link to="/profile" search={{ tab: "carteira" }}>
            <KpiTile
              label={copy.dashboard.profit24h}
              icon={TrendingUp}
              value={
                <span className={cn(("pnl" in me ? me.pnl : 0) >= 0 ? "text-up" : "text-down")}>
                  <AnimatedNumber value={"pnl" in me ? me.pnl : 0} format={formatBRL} />
                </span>
              }
              sub={dbProfile ? "Atualizado em tempo real" : undefined}
              interactive
            />
          </Link>
          <Link to="/profile">
            <KpiTile
              label={copy.dashboard.precision}
              value={
                <AnimatedNumber
                  value={("accuracy" in me ? me.accuracy : 0.5) * 100}
                  decimals={1}
                  suffix="%"
                />
              }
              sub={copy.dashboard.precisionSub}
              interactive
            />
          </Link>
          <Link to="/ranking">
            <KpiTile
              label="Ranking"
              value={
                myRank ? (
                  <span>#{myRank}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )
              }
              sub={
                myRank && traders.length
                  ? `Top ${((myRank / traders.length) * 100).toFixed(1)}%`
                  : "Explore o ranking"
              }
              interactive
            />
          </Link>
        </div>
      </div>

      {actionNow.length > 0 && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <h2 className="heading-subsection">
            <span className="text-highlight">Ação</span> agora
          </h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {actionNow.slice(0, 3).map((item) => {
              if (item.type === "position") {
                return (
                  <Link
                    key={item.bet.id}
                    to="/markets/$marketId"
                    params={{ marketId: item.bet.marketId }}
                    className="flex-1 rounded-xl border bg-card/80 px-3 py-2 text-sm hover:border-primary/40"
                  >
                    <span className="text-xs uppercase text-muted-foreground">
                      {copy.dashboard.positionLine} ·{" "}
                      {copy.dashboard.positionEst(
                        `${item.estPnL >= 0 ? "+" : ""}${formatBRL(item.estPnL)}`,
                      )}
                      {item.minutesLeft < 15 ? ` · ${Math.ceil(item.minutesLeft)}min` : ""}
                    </span>
                    <div className="line-clamp-1 font-medium">{item.bet.marketQuestion}</div>
                  </Link>
                );
              }
              if (item.type === "closing") {
                return (
                  <Link
                    key={item.market.id}
                    to="/markets/$marketId"
                    params={{ marketId: item.market.id }}
                    className="flex-1 rounded-xl border bg-card/80 px-3 py-2 text-sm hover:border-primary/40"
                  >
                    <span className="text-xs uppercase text-muted-foreground">
                      {copy.ia.closingWithIa}
                    </span>
                    <div className="line-clamp-1 font-medium">{item.market.question}</div>
                  </Link>
                );
              }
              if (item.type === "daily_mission") {
                return (
                  <Link
                    key={`mission-${item.market.id}`}
                    to="/markets/$marketId"
                    params={{ marketId: item.market.id }}
                    className="flex-1 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm hover:border-primary/50"
                  >
                    <span className="text-xs uppercase text-primary">
                      {copy.retention.dailyMission}
                    </span>
                    <div className="line-clamp-1 font-medium">{item.market.question}</div>
                    <div className="text-[10px] text-muted-foreground">{item.market.region}</div>
                  </Link>
                );
              }
              if (item.type === "followed") {
                return (
                  <Link
                    key={`followed-${item.trader.id}`}
                    to="/profile/$userId"
                    params={{ userId: item.trader.id }}
                    className="flex-1 rounded-xl border bg-card/80 px-3 py-2 text-sm hover:border-primary/40"
                  >
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
                      <Users className="size-3" /> Trader seguido
                    </span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <img
                        src={item.trader.avatar}
                        className="size-5 rounded-full bg-surface"
                        alt={item.trader.name}
                      />
                      <span className="font-medium truncate">{item.trader.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Precisão {(item.trader.accuracy * 100).toFixed(0)}% · {item.trader.division}
                    </div>
                  </Link>
                );
              }
              if (item.type === "urbanmind") {
                return (
                  <Link
                    key="um"
                    to="/urbanmind"
                    search={{ marketId: item.market.id }}
                    className="flex-1 rounded-xl border bg-card/80 px-3 py-2 text-sm hover:border-primary/40"
                  >
                    <span className="text-[10px] uppercase text-muted-foreground">UrbanMind</span>
                    <div className="font-medium">Previsão · {item.market.region}</div>
                  </Link>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {/* Core — mercados em alta */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="heading-subsection">
            Mercados em <span className="text-highlight">alta</span>
          </h2>
          <Link
            to="/markets"
            search={{ status: "live" }}
            className="text-xs text-primary hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {top.map((m) => (
            <MarketCard key={m.id} m={m} compact />
          ))}
        </div>
      </div>

      <DailyPulse />
      <DailyMissions />

      {/* Fold 3 — performance + posições abertas */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="heading-subsection mb-3">
            Seus <span className="text-highlight">ganhos</span>
          </h2>
          <SurfaceCard className="p-4">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-2xl font-semibold mono",
                  pnlTotal >= 0 ? "text-up" : "text-down",
                )}
              >
                {pnlTotal >= 0 ? "+" : ""}
                {formatBRL(pnlTotal)}
              </span>
              {pnlPct && (
                <span className={cn("text-xs", pnlDelta >= 0 ? "text-up" : "text-down")}>
                  {pnlDelta >= 0 ? "+" : ""}
                  {pnlPct}%
                </span>
              )}
            </div>
            <Suspense fallback={<ChartFallback />}>
              <DashboardPnlChart
                data={chartData}
                showHint={!pnlSeries.length ? copy.dashboard.gainsChartHint : ""}
              />
            </Suspense>
          </SurfaceCard>
        </div>

        <div id="open-positions">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="heading-subsection">
              Suas <span className="text-highlight">posições</span> abertas
            </h2>
            <Link
              to="/profile"
              search={{ tab: "posicoes" }}
              className="text-xs text-primary hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          <div className="space-y-2">
            {topOpen.length === 0 && (
              <EmptyState
                compact
                title={copy.empty.positions.title}
                description={copy.empty.positions.description}
                action={{
                  label: copy.empty.positions.cta,
                  to: "/markets",
                  search: { status: "live" },
                }}
              />
            )}
            {topOpen.map((bet) => {
              const live = markets.find((m) => m.id === bet.marketId);
              const poolYes = live ? live.pool.YES : bet.poolYes;
              const poolNo = live ? live.pool.NO : bet.poolNo;
              const totalPool = poolYes + poolNo;
              const sidePool = bet.side === "YES" ? poolYes : poolNo;
              const share = bet.share ?? (sidePool > 0 ? bet.stake / sidePool : 0);
              const estPayout = share * totalPool * PRIZE_RATIO;
              const estPnL = estPayout - bet.stake;
              return (
                <Link
                  key={bet.id}
                  to="/markets/$marketId"
                  params={{ marketId: bet.marketId }}
                  className="block rounded-xl border bg-card/60 p-3 backdrop-blur transition hover:bg-surface/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{bet.marketRegion}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">
                        {bet.marketQuestion}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div
                        className={cn("mono text-sm", bet.side === "YES" ? "text-up" : "text-down")}
                      >
                        {bet.side === "YES" ? "SIM" : "NÃO"}
                      </div>
                      <div
                        className={cn("mono text-[11px]", estPnL >= 0 ? "text-up" : "text-down")}
                      >
                        {estPnL >= 0 ? "+" : ""}
                        {formatBRL(estPnL)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {deferredReady && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Suspense fallback={<ChartFallback />}>
              <UrbanMindDigestCard />
            </Suspense>
            <Suspense fallback={<ChartFallback />}>
              <WeeklyChallengeCard accuracy={"accuracy" in me ? me.accuracy : 0.5} />
            </Suspense>
          </div>
          <Suspense fallback={<ChartFallback />}>
            <PrecisionReportCard />
          </Suspense>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DailyPoll />
        <TomorrowPreview markets={markets} />
        <NeighborhoodWidget
          neighborhood={dbProfile?.neighborhood ?? null}
          city={dbProfile?.city ?? "São Paulo"}
        />
      </div>

      {casinoEnabled && deferredReady && (
        <Suspense fallback={<ChartFallback />}>
          <SpinWheel
            onDepositBonusCta={() => navigate({ to: "/profile", search: { tab: "carteira" } })}
          />
        </Suspense>
      )}

      {/* Mapa + feed (menor prioridade) */}
      {deferredReady && (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="heading-subsection mb-3">
              Mapa da <span className="text-highlight">cidade</span>
            </h2>
            <Suspense
              fallback={<div className="h-[360px] animate-pulse rounded-2xl bg-surface/60" />}
            >
              <CityHeatmap
                height={360}
                regions={regions}
                showLiveLink
                onRegionClick={(r) => {
                  const top = findTopMarketForRegion(markets, r);
                  if (top) navigate({ to: "/markets/$marketId", params: { marketId: top.id } });
                  else {
                    navigate({ to: "/markets", search: { region: r.name } });
                    toast.message("Lista filtrada por região");
                  }
                }}
              />
            </Suspense>
          </div>
          <div>
            <h2 className="heading-subsection mb-3">
              <span className="text-highlight">Feed</span>
            </h2>
            <div className="space-y-2">
              {feed.slice(0, 4).map((p) => (
                <Link
                  to="/feed"
                  key={p.id}
                  className="block rounded-xl border bg-card/60 p-3 backdrop-blur hover:bg-surface/60"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={p.user.avatar}
                      className="size-7 rounded-full bg-surface"
                      alt={p.user.name}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">
                        {p.user.name}{" "}
                        <span className="text-muted-foreground">@{p.user.handle}</span>
                      </div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">{p.text}</div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(p.time, { locale: ptBR, addSuffix: false })}
                    </span>
                  </div>
                </Link>
              ))}
              {feed.length === 0 && (
                <EmptyState
                  compact
                  title={copy.empty.dashboardFeed.title}
                  description={copy.empty.dashboardFeed.description}
                  action={{ label: copy.empty.dashboardFeed.cta, to: "/feed" }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
