import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useEffect, useState, useRef, lazy, Suspense } from "react";
import { findTopMarketForRegion } from "@/lib/region-market";
import { toast } from "sonner";
import { useViaX } from "@/store/viax-store";
import { useAuth } from "@/hooks/use-auth";
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
import { useBelowFoldMount } from "@/hooks/use-below-fold-mount";

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
const DailyPulse = lazy(() =>
  import("@/components/viax/daily-pulse").then((m) => ({ default: m.DailyPulse })),
);
const DailyMissions = lazy(() =>
  import("@/components/viax/daily-missions").then((m) => ({ default: m.DailyMissions })),
);
const DailyPoll = lazy(() =>
  import("@/components/viax/daily-poll").then((m) => ({ default: m.DailyPoll })),
);
const SeasonalEventsStrip = lazy(() =>
  import("@/components/viax/seasonal-events-strip").then((m) => ({
    default: m.SeasonalEventsStrip,
  })),
);
const ComebackBanner = lazy(() =>
  import("@/components/viax/comeback-banner").then((m) => ({ default: m.ComebackBanner })),
);
const StreakRiskBanner = lazy(() =>
  import("@/components/viax/streak-risk-banner").then((m) => ({ default: m.StreakRiskBanner })),
);
const TomorrowPreview = lazy(() =>
  import("@/components/viax/tomorrow-preview").then((m) => ({ default: m.TomorrowPreview })),
);
const NeighborhoodWidget = lazy(() =>
  import("@/components/viax/neighborhood-widget").then((m) => ({ default: m.NeighborhoodWidget })),
);
const InviteFriendsCard = lazy(() =>
  import("@/components/viax/invite-friends-card").then((m) => ({ default: m.InviteFriendsCard })),
);

function ChartFallback() {
  return <div className="h-[140px] animate-pulse rounded-xl bg-surface/60" />;
}
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
import { useRecommendedMarkets } from "@/hooks/use-recommended-markets";
import { useMyLeagues } from "@/hooks/use-leagues";
import { useTrendingTraders } from "@/hooks/use-trending-traders";
import { useCasinoEnabled } from "@/hooks/use-casino-enabled";
import { WeeklyReportModal } from "@/components/viax/weekly-report-modal";
import { useWeeklyReport } from "@/hooks/use-weekly-report";
import { scheduleDailyPush } from "@/lib/push-scheduler";
import { DivisionUpModal } from "@/components/viax/division-up-modal";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { useFollowingActiveBets } from "@/hooks/use-following-active-bets";
import { useWinToast } from "@/hooks/use-win-toast";
import { getOrAssignVariant, trackProductEvent } from "@/lib/product-analytics";
import { AppLoadingSkeleton } from "@/components/viax/app-loading-skeleton";

function WidgetFallback({ className = "h-24" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface/60", className)} />;
}

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
  const casinoReady = useBelowFoldMount(2500);
  const { enabled: casinoEnabled } = useCasinoEnabled();
  const { from, highlight } = Route.useSearch();
  const { userId, isRegistered, authReady } = useAuth();
  const { me, profile: dbProfile } = useResolvedProfile();
  const { data: weeklyReport, shouldShow: showWeeklyReport, shouldShowMidweek } = useWeeklyReport();
  const [weeklyReportDismissed, setWeeklyReportDismissed] = useState(false);
  const [midweekReportDismissed, setMidweekReportDismissed] = useState(false);
  const [divisionUp, setDivisionUp] = useState<string | null>(null);
  const { openDeposit: openDepositSheet } = useDepositSheet();
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
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, highlight: undefined }),
      replace: true,
    });
  }, [highlight, navigate]);

  const { data: bets } = useBets();
  const openBets = (bets ?? []).filter((b) => isOpenBetStatus(b.marketStatus));
  const topOpen = openBets.slice(0, 3);
  const [ctaVariant, setCtaVariant] = useState<"deposit_first" | "market_first">("deposit_first");

  const { transactions } = useResolvedTransactions();
  const pnlSeries = usePnlSeries(transactions);

  const { traders } = useResolvedTraders();
  const myRank = useMemo(() => {
    if (!userId || !traders.length) return null;
    const idx = traders.findIndex((t) => t.id === userId);
    return idx >= 0 ? idx + 1 : null;
  }, [traders, userId]);

  const { ids: followedIds } = useFollowedTraders();
  const { data: followingBets } = useFollowingActiveBets();
  const { data: myLeagues = [] } = useMyLeagues();
  const { data: trendingTraders = [] } = useTrendingTraders(3);
  useWinToast();

  useEffect(() => {
    const assigned = getOrAssignVariant(
      "dashboard_primary_cta",
      ["deposit_first", "market_first"] as const,
      userId ?? "anon",
    ) as "deposit_first" | "market_first";
    setCtaVariant(assigned);
    trackProductEvent("dashboard_cta_variant_assigned", {
      variant: assigned,
      userId: userId ?? "anon",
    });
  }, [userId]);

  useEffect(() => {
    if (!me) return;
    trackProductEvent("view_dashboard", {
      variant: ctaVariant,
      balance: me.balance,
      openPositions: openBets.length,
      liveMarkets: markets.length,
    });
  }, [ctaVariant, me, openBets.length, markets.length]);

  useEffect(() => {
    if (topOpen.length > 0) {
      trackProductEvent("open_positions_viewed", { count: topOpen.length, source: "dashboard" });
    }
  }, [topOpen.length]);

  const liveCount = markets.filter((m) => m.status === "live" || m.status === "closing").length;
  const { markets: recommended, label: recommendedLabel } = useRecommendedMarkets(
    markets,
    dbProfile,
    openBets,
  );
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

  const primaryCta = useMemo(() => {
    if (!me) {
      return {
        title: copy.common.loading,
        description: "",
        actionLabel: copy.common.loading,
        onAction: () => {},
      };
    }
    if (me.balance < 80) {
      return {
        title: "Saldo baixo para operar",
        description: "Adicione saldo e volte para os mercados ao vivo.",
        actionLabel: "Depositar agora",
        onAction: () => {
          trackProductEvent("click_deposit", { source: "dashboard_primary", variant: ctaVariant });
          navigate({ to: "/wallet", search: { tab: "deposit" } });
        },
      };
    }
    if (openBets.length > 0) {
      return {
        title: "Você tem posições em aberto",
        description: "Gerencie risco e acompanhe fechamento das suas posições.",
        actionLabel: "Gerir posições",
        onAction: () => navigate({ to: "/positions" }),
      };
    }
    if (ctaVariant === "deposit_first") {
      return {
        title: "Pronto para aumentar sua exposição?",
        description: "Reforce banca antes da próxima entrada.",
        actionLabel: "Depositar agora",
        onAction: () => {
          trackProductEvent("click_deposit", { source: "dashboard_primary", variant: ctaVariant });
          navigate({ to: "/wallet", search: { tab: "deposit" } });
        },
      };
    }
    return {
      title: "Mercados quentes esperando sua leitura",
      description: "Entre agora e capture os movimentos do dia.",
      actionLabel: "Apostar agora",
      onAction: () => navigate({ to: "/markets", search: { status: "live" } }),
    };
  }, [ctaVariant, me, navigate, openBets.length]);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // Ticker para countdown dos mercados que encerram em breve
  const [now, setNow] = useState(() => Date.now());
  const THIRTY_MIN = 30 * 60 * 1000;
  const closingSoon = useMemo(
    () =>
      markets
        .filter(
          (m) =>
            (m.status === "live" || m.status === "closing") &&
            m.endsAt > now &&
            m.endsAt - now <= THIRTY_MIN,
        )
        .sort((a, b) => a.endsAt - b.endsAt)
        .slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markets, now],
  );
  useEffect(() => {
    if (!closingSoon.length) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [closingSoon.length]);

  const pnlToday = useMemo(() => {
    return (transactions ?? [])
      .filter((tx) => tx.time >= todayStart)
      .reduce((acc, tx) => acc + (tx.type === "entry" ? -tx.amount : tx.amount), 0);
  }, [transactions, todayStart]);

  const pnlTotal = pnlSeries.length
    ? pnlSeries[pnlSeries.length - 1].v
    : me && "pnl" in me
      ? me.pnl
      : 0;
  const pnlStart = pnlSeries.length > 1 ? pnlSeries[0].v : 0;
  const pnlDelta = pnlTotal - pnlStart;
  const pnlPct = pnlStart !== 0 ? ((pnlDelta / Math.abs(pnlStart)) * 100).toFixed(1) : null;

  const chartData = pnlSeries.length
    ? pnlSeries.map((p) => ({ d: p.label, pnl: p.v }))
    : [{ d: "—", pnl: 0 }];

  if (!authReady || !isRegistered || !me) {
    return <AppLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Weekly Pulse Report — segunda-feira */}
      {deferredReady && showWeeklyReport && !weeklyReportDismissed && weeklyReport && (
        <WeeklyReportModal report={weeklyReport} onClose={() => setWeeklyReportDismissed(true)} />
      )}
      {/* Mid-week flash — quinta-feira */}
      {deferredReady && shouldShowMidweek && !midweekReportDismissed && weeklyReport && (
        <WeeklyReportModal
          report={weeklyReport}
          compact
          onClose={() => setMidweekReportDismissed(true)}
        />
      )}

      {/* Division-up celebration */}
      <DivisionUpModal newDivision={divisionUp} onClose={() => setDivisionUp(null)} />

      {isRegistered && (
        <Link
          to="/markets/create"
          className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm hover:bg-primary/10"
        >
          <span>
            <span className="font-medium text-foreground">{copy.community.createTitle}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {copy.community.createSubtitle}
            </span>
          </span>
          <span className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            {copy.community.createLink}
          </span>
        </Link>
      )}
      {deferredReady && (
        <Suspense fallback={<WidgetFallback className="h-12" />}>
          <ComebackBanner newMarketsCount={markets.length} />
        </Suspense>
      )}
      {deferredReady && (
        <Suspense fallback={<WidgetFallback className="h-14" />}>
          <SeasonalEventsStrip variant="dashboard" />
        </Suspense>
      )}
      {deferredReady && (
        <Suspense fallback={<WidgetFallback className="h-12" />}>
          <StreakRiskBanner />
        </Suspense>
      )}

      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{primaryCta.title}</h2>
            <p className="text-xs text-muted-foreground">{primaryCta.description}</p>
          </div>
          <button
            type="button"
            onClick={primaryCta.onAction}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            {primaryCta.actionLabel}
          </button>
        </div>
      </div>

      {/* Banner de saldo baixo — abre sheet de depósito sem navegar */}
      {me.balance < 80 && me.balance >= 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-warn/35 bg-warn/10 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Saldo baixo: <span className="font-medium text-warn">{formatBRL(me.balance)}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              trackProductEvent("click_deposit", { source: "dashboard_low_balance_banner" });
              openDepositSheet();
            }}
            className="shrink-0 rounded-lg bg-warn px-4 py-2 text-sm font-semibold text-warn-foreground hover:opacity-90 transition"
          >
            Depositar agora
          </button>
        </div>
      )}

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
          <button
            type="button"
            onClick={() => {
              trackProductEvent("click_deposit", { source: "dashboard_kpi_balance" });
              openDepositSheet();
            }}
            className="text-left"
          >
            <KpiTile
              label="Saldo"
              icon={TrendingUp}
              value={
                deferredReady ? <AnimatedNumber value={me.balance} format={formatBRL} /> : formatBRL(me.balance)
              }
              interactive
            />
          </button>
          <Link to="/wallet">
            <KpiTile
              label={copy.dashboard.profit24h}
              icon={TrendingUp}
              value={
                <span className={cn(pnlToday >= 0 ? "text-up" : "text-down")}>
                  {deferredReady ? <AnimatedNumber value={pnlToday} format={formatBRL} /> : formatBRL(pnlToday)}
                </span>
              }
              sub={pnlToday >= 0 ? "Acumulado hoje" : "Perda acumulada hoje"}
              interactive
            />
          </Link>
          <Link to="/profile">
            <KpiTile
              label={copy.dashboard.roi}
              value={
                <span className={cn(("roi" in me ? me.roi : 0) >= 0 ? "text-up" : "text-down")}>
                  {deferredReady ? (
                    <AnimatedNumber
                      value={("roi" in me ? me.roi : 0) * 100}
                      decimals={1}
                      suffix="%"
                    />
                  ) : (
                    `${((("roi" in me ? me.roi : 0) * 100) as number).toFixed(1)}%`
                  )}
                </span>
              }
              sub="Retorno sobre capital"
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

      {/* Traders seguidos — posições ativas */}
      {(followingBets ?? []).length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="heading-subsection flex items-center gap-2">
              <span className="size-2 rounded-full bg-up animate-pulse inline-block" />
              Traders <span className="text-highlight ml-1">seguidos prevendo agora</span>
            </h2>
            <Link to="/ranking" className="text-xs text-primary hover:underline">
              Ver ranking →
            </Link>
          </div>
          <div className="space-y-2">
            {(followingBets ?? []).slice(0, 4).map((b) => (
              <Link
                key={b.betId}
                to="/markets/$marketId"
                params={{ marketId: b.marketId }}
                search={{ side: b.side }}
                className="flex items-center gap-3 rounded-xl border bg-card/60 px-4 py-3 backdrop-blur hover:border-primary/30 transition"
              >
                <img
                  src={b.traderAvatar}
                  alt={b.traderName}
                  className="size-8 rounded-full border shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{b.traderName}</span>
                    <span>previu</span>
                    <span
                      className={cn("font-bold mono", b.side === "YES" ? "text-up" : "text-down")}
                    >
                      {b.side === "YES" ? "SIM" : "NÃO"}
                    </span>
                  </div>
                  <div className="line-clamp-1 text-sm">{b.marketQuestion}</div>
                </div>
                <span className="shrink-0 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] text-primary">
                  Copiar →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Encerra em breve — urgência */}
      {closingSoon.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="heading-subsection flex items-center gap-2">
              <span className="size-2 rounded-full bg-warn animate-pulse inline-block" />
              <span className="text-warn">Últimas apostas</span>
            </h2>
            <Link
              to="/markets"
              search={{ status: "closing" }}
              className="text-xs text-primary hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {closingSoon.map((m) => {
              const secsLeft = Math.max(0, Math.floor((m.endsAt - now) / 1000));
              const mins = Math.floor(secsLeft / 60);
              const secs = secsLeft % 60;
              const countdown = `${mins}:${String(secs).padStart(2, "0")}`;
              return (
                <Link
                  key={m.id}
                  to="/markets/$marketId"
                  params={{ marketId: m.id }}
                  onClick={() =>
                    trackProductEvent("market_opened_from_dashboard", {
                      source: "closing_soon",
                      marketId: m.id,
                    })
                  }
                  className="flex items-center justify-between gap-3 rounded-xl border border-warn/20 bg-warn/5 px-4 py-3 text-sm hover:border-warn/40 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase text-muted-foreground">{m.region}</div>
                    <div className="line-clamp-1 font-medium">{m.question}</div>
                  </div>
                  <span className="shrink-0 rounded-lg border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-xs font-semibold text-warn">
                    {countdown}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Core — mercados recomendados / em alta */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="heading-subsection">
            Mercados <span className="text-highlight">{recommendedLabel}</span>
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
          {recommended.map((m) => (
            <div
              key={m.id}
              onClick={() =>
                trackProductEvent("market_opened_from_dashboard", {
                  source: recommendedLabel === "Para você" ? "recommended_markets" : "top_markets",
                  marketId: m.id,
                })
              }
            >
              <MarketCard m={m} compact />
            </div>
          ))}
        </div>
      </div>

      {deferredReady && (
        <Suspense fallback={<WidgetFallback />}>
          <DailyPulse />
        </Suspense>
      )}
      {deferredReady && isRegistered && dbProfile?.handle && (
        <Suspense fallback={<WidgetFallback />}>
          <InviteFriendsCard handle={dbProfile.handle} />
        </Suspense>
      )}

      {isRegistered &&
        (myLeagues.length > 0 ? (
          <div className="rounded-2xl border border-primary/25 bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Sua <span className="text-highlight">liga</span>
              </h3>
              <Link to="/leagues" className="text-xs text-primary hover:underline">
                Ver liga completa →
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {myLeagues.slice(0, 2).map((league) => (
                <Link
                  key={league.id}
                  to="/leagues"
                  className="flex items-center justify-between gap-3 rounded-xl border bg-surface/50 px-3 py-2 text-sm hover:border-primary/30 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{league.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {league.member_count} membro{league.member_count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-primary">→</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Link
            to="/leagues"
            className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 px-4 py-3 text-sm hover:border-primary/50 hover:bg-primary/5 transition"
          >
            <span>
              <span className="font-medium">Crie uma liga com amigos</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Compete, sobe de divisão, ganha XP em grupo
              </span>
            </span>
            <span className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              Criar
            </span>
          </Link>
        ))}

      {deferredReady && (
        <Suspense fallback={<WidgetFallback />}>
          <DailyMissions />
        </Suspense>
      )}

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
            <Link to="/positions" className="text-xs text-primary hover:underline">
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
                  onClick={() =>
                    trackProductEvent("market_opened_from_dashboard", {
                      source: "open_positions",
                      marketId: bet.marketId,
                    })
                  }
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

      {deferredReady && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<WidgetFallback />}>
            <DailyPoll />
          </Suspense>
          <Suspense fallback={<WidgetFallback />}>
            <TomorrowPreview markets={markets} />
          </Suspense>
          <Suspense fallback={<WidgetFallback />}>
            <NeighborhoodWidget
              neighborhood={dbProfile?.neighborhood ?? null}
              city={dbProfile?.city ?? "São Paulo"}
            />
          </Suspense>
        </div>
      )}

      {/* Traders em Alta — momentum semanal */}
      {deferredReady && trendingTraders.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="heading-subsection">
              Traders <span className="text-highlight">em Alta</span> esta semana
            </h2>
            <Link to="/ranking" className="text-xs text-primary hover:underline">
              Ver ranking →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {trendingTraders.map((t) => (
              <Link
                key={t.user_id}
                to="/profile/$userId"
                params={{ userId: t.user_id }}
                className="flex items-center gap-3 rounded-xl border bg-card/60 px-3 py-3 backdrop-blur hover:border-primary/30 transition"
              >
                <img src={t.avatar} alt={t.name} className="size-9 rounded-full border shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    🔥 {t.wins_7d}/{t.bets_7d} acertos · {t.accuracy_7d}% esta semana
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
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

      {casinoEnabled && casinoReady && (
        <section id="casino-below-fold" aria-label="Roleta diária">
          <Suspense fallback={<ChartFallback />}>
            <SpinWheel onDepositBonusCta={() => navigate({ to: "/wallet" })} />
          </Suspense>
        </section>
      )}
    </div>
  );
}
