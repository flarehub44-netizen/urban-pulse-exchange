import { copy } from "@/copy/pt-BR";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { MarketsSearch } from "@/routes/markets";
import { parseAuthModalSearch } from "@/lib/auth-modal-search";
import { useMemo, useEffect, useState } from "react";
import { useCatalogMarkets, useMarkets } from "@/hooks/use-markets";
import { useBets } from "@/hooks/use-bets";
import { useQueryClient } from "@tanstack/react-query";
import { MarketCardSkeleton } from "@/components/viax/market-card-skeleton";
import { InlineError } from "@/components/viax/inline-error";
import { getMarketEdge } from "@/lib/market-edge";
import { useWatchlist } from "@/hooks/use-watchlist";
import { MarketCard } from "@/components/viax/market-card";
import { MobileMarketsCarousel } from "@/components/viax/mobile-markets-carousel";
import {
  Search,
  Star,
  X,
  TrendingUp,
  Clock,
  Bot,
  MapPin,
  SlidersHorizontal,
  Brain,
} from "lucide-react";
import { EmptyState } from "@/components/viax/empty-state";
import { cn } from "@/lib/utils";
import { loadMarketsFilters, saveMarketsFilters } from "@/lib/markets-filter-persist";
import {
  isOpenBetStatus,
  isSettledDisplay,
  marketCatalogSortTier,
} from "@/lib/market-status";
import {
  MARKET_CATEGORY_FILTERS,
  matchesStatusFilter,
  type MarketCategoryFilter,
} from "@/lib/markets-catalog";
import { useAuthPublic } from "@/hooks/use-auth-public";
import { useProfile } from "@/hooks/use-profile";
import { PageHeader } from "@/components/viax/page-header";
import { CommunityMarketsList } from "@/components/viax/community-markets-list";
import { DepositPromptBanner } from "@/components/viax/deposit-prompt-banner";
import { useHasDeposited } from "@/hooks/use-has-deposited";
import { MarketsSegmentTabs } from "@/components/viax/markets-segment-tabs";
import { FootballMarketsList } from "@/components/football/football-markets-list";
import { DepositFunnelBannerSlot } from "@/components/viax/deposit-funnel-banner-slot";
import { parseMarketSegment, segmentDescription } from "@/lib/markets-segment";
import type { MarketSegment } from "@/routes/markets";
import { SeasonalEventsStrip } from "@/components/viax/seasonal-events-strip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { trackProductEvent } from "@/lib/product-analytics";
import { useTrafficPublicState } from "@/hooks/use-traffic-public-state";
import { useTrafficEndedMarkets } from "@/hooks/use-traffic-ended-markets";
import { TrafficLiveHero } from "@/components/viax/traffic-live-hero";
import { TrafficSlotWaiting } from "@/components/viax/traffic-slot-waiting";
import { TrafficEndedCard } from "@/components/viax/traffic-ended-card";

export const Route = createFileRoute("/markets/")({
  head: () => ({
    meta: [
      { title: "Mercados · ViaX" },
      { name: "description", content: copy.markets.metaDescription },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): MarketsSearch => {
    const status = search.status;
    const validStatus =
      status === "live" ||
      status === "closing" ||
      status === "dispute" ||
      status === "resolved" ||
      status === "ended" ||
      status === "draft"
        ? status
        : undefined;
    const cat = search.category;
    const validCat = MARKET_CATEGORY_FILTERS.includes(cat as MarketCategoryFilter)
      ? (cat as MarketCategoryFilter)
      : undefined;
    return {
      segment: parseMarketSegment(search),
      region: typeof search.region === "string" && search.region ? search.region : undefined,
      status: validStatus,
      category: validCat,
      favorites: search.favorites === "1" ? "1" : undefined,
      q: typeof search.q === "string" && search.q ? search.q : undefined,
      hasPosition: search.hasPosition === "1" ? "1" : undefined,
      sort:
        search.sort === "edge" || search.sort === "closing" || search.sort === "trend"
          ? search.sort
          : undefined,
      aiPicks: search.aiPicks === "1" ? "1" : undefined,
      marketMissing: search.marketMissing === "1" ? "1" : undefined,
      ...parseAuthModalSearch(search),
    };
  },
  component: MarketsList,
});

const baseStatusFilters = [
  { key: "all" as const, label: "Todos" },
  { key: "live" as const, label: "Ao vivo" },
  { key: "closing" as const, label: "Encerrando" },
  { key: "dispute" as const, label: "Em disputa" },
  { key: "resolved" as const, label: "Resolvidos" },
];
const draftFilter = { key: "draft" as const, label: "Rascunhos" };
const endedFilter = { key: "ended" as const, label: copy.traffic.endedTab };

function MarketsList() {
  const navigate = useNavigate({ from: "/markets/" });
  const search = Route.useSearch();
  const { userId, isRegistered } = useAuthPublic();
  const { data: profile } = useProfile(userId);
  const { data: hasDeposited } = useHasDeposited(userId);
  const markets = useCatalogMarkets();
  const { isLoading: marketsLoading, error: marketsError, refetch } = useMarkets();
  const queryClient = useQueryClient();
  const { ids: watchlist } = useWatchlist();
  const { data: bets } = useBets({ enabled: Boolean(userId) });
  const openMarketIds = useMemo(
    () =>
      new Set((bets ?? []).filter((b) => isOpenBetStatus(b.marketStatus)).map((b) => b.marketId)),
    [bets],
  );

  const segment: MarketSegment = search.segment ?? "transito";
  const statusKey = search.status ?? "all";
  const transitoStatusFilters = [
    ...baseStatusFilters.filter((f) => f.key !== "resolved"),
    endedFilter,
  ];
  const statusFiltersBase = profile?.isAdmin
    ? [...baseStatusFilters, draftFilter]
    : baseStatusFilters;
  const statusFilters =
    segment === "transito"
      ? profile?.isAdmin
        ? [...transitoStatusFilters, draftFilter]
        : transitoStatusFilters
      : statusFiltersBase;
  const { data: trafficState, isLoading: trafficStateLoading } = useTrafficPublicState();
  const isTrafficEndedTab = segment === "transito" && statusKey === "ended";
  const { data: endedSlots, isLoading: endedSlotsLoading } = useTrafficEndedMarkets(50, isTrafficEndedTab);
  const category = search.category ?? null;
  const showFavorites = search.favorites === "1";
  const q = search.q ?? "";
  const regionFilter = search.region;
  const hasPosition = search.hasPosition === "1";
  const sortKey = search.sort;
  const aiPicks = search.aiPicks === "1";

  const userRegion = profile?.neighborhood || profile?.city || null;

  const [qInput, setQInput] = useState(q);
  const [hydrated, setHydrated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => setQInput(q), [q]);

  useEffect(() => {
    if (!mounted || hydrated) return;
    const empty =
      !search.status &&
      !search.category &&
      !search.favorites &&
      !search.hasPosition &&
      !search.sort &&
      !search.region &&
      !search.q;
    if (empty) {
      const saved = loadMarketsFilters();
      if (saved && (saved.status || saved.category || saved.sort || saved.hasPosition)) {
        navigate({ search: saved, replace: true });
      } else {
        navigate({
          search: (prev) => ({ ...prev, status: "live", sort: "closing" }),
          replace: true,
        });
      }
    }
    setHydrated(true);
  }, [hydrated, search, navigate]);

  useEffect(() => {
    if (!hydrated) return;
    saveMarketsFilters(search);
  }, [
    hydrated,
    search.status,
    search.category,
    search.sort,
    search.hasPosition,
    search.q,
    search.region,
    search.aiPicks,
    search.segment,
  ]);

  const patchSearch = (patch: Partial<MarketsSearch>, source = "markets_ui") => {
    trackProductEvent("filter_applied", {
      source,
      segment: segment,
      status: patch.status ?? search.status ?? "all",
      sort: patch.sort ?? search.sort ?? "trend",
      favorites: patch.favorites === "1" || search.favorites === "1",
      hasPosition: patch.hasPosition === "1" || search.hasPosition === "1",
      aiPicks: patch.aiPicks === "1" || search.aiPicks === "1",
      hasQuery: Boolean((patch.q ?? search.q)?.length),
    });
    navigate({
      search: (prev: MarketsSearch) => {
        const next = {
          ...prev,
          ...patch,
          region: patch.region !== undefined ? patch.region : prev.region,
        };
        saveMarketsFilters(next);
        return next;
      },
      replace: true,
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== (search.q ?? "")) patchSearch({ q: qInput || undefined }, "search_input");
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const list = useMemo(() => {
    const filtered = markets.filter((m) => {
      if (segment === "transito" && m.isTrafficSlot) return false;
      if (showFavorites) return watchlist.includes(m.id);
      if (hasPosition && !openMarketIds.has(m.id)) return false;
      if (regionFilter && !m.region.toLowerCase().includes(regionFilter.toLowerCase()))
        return false;
      if (
        q &&
        !m.question.toLowerCase().includes(q.toLowerCase()) &&
        !m.region.toLowerCase().includes(q.toLowerCase())
      )
        return false;
      if (category && m.category !== category) return false;
      if (aiPicks && getMarketEdge(m).edgePp < 12) return false;
      return matchesStatusFilter(m.status, statusKey, m.endsAt);
    });
    const now = Date.now();
    return [...filtered].sort((a, b) => {
      const tierDiff = marketCatalogSortTier(a.status) - marketCatalogSortTier(b.status);
      if (tierDiff !== 0) return tierDiff;
      if (sortKey === "edge")
        return Math.abs(getMarketEdge(b).edgePp) - Math.abs(getMarketEdge(a).edgePp);
      if (sortKey === "closing") {
        const aLeft = a.endsAt - now;
        const bLeft = b.endsAt - now;
        if (isSettledDisplay(a.status) && !isSettledDisplay(b.status)) return 1;
        if (isSettledDisplay(b.status) && !isSettledDisplay(a.status)) return -1;
        return aLeft - bLeft;
      }
      return Math.abs(b.trend) - Math.abs(a.trend);
    });
  }, [
    markets,
    statusKey,
    category,
    q,
    regionFilter,
    showFavorites,
    watchlist,
    hasPosition,
    openMarketIds,
    sortKey,
    aiPicks,
    segment,
  ]);

  useEffect(() => {
    if (!mounted) return;
    trackProductEvent("market_list_view", {
      segment,
      status: statusKey,
      listed: list.length,
      hasQuery: Boolean(q),
      favorites: showFavorites,
      aiPicks,
      hasPosition,
    });
  }, [mounted, segment, statusKey, list.length, q, showFavorites, aiPicks, hasPosition]);

  return (
    <div className="space-y-5">
      {isRegistered && hasDeposited === false && segment === "transito" && <DepositPromptBanner />}

      <PageHeader
        title={<span className="text-highlight">Mercados</span>}
        description={segmentDescription(segment)}
        className="page-section"
      />

      <MarketsSegmentTabs
        segment={segment}
        onChange={(s) => patchSearch({ segment: s === "transito" ? undefined : s })}
      />

      <SeasonalEventsStrip variant="compact" showCta={false} />

      {search.marketMissing === "1" && (
        <div
          className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn"
          role="status"
        >
          {copy.markets.marketNotFoundBanner}
        </div>
      )}

      {!mounted && (
        <div className="space-y-4">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-surface-2" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <MarketCardSkeleton key={`initial-${i}`} />
            ))}
          </div>
        </div>
      )}

      {mounted && segment === "futebol" && (
        <>
          <DepositFunnelBannerSlot />
          <FootballMarketsList embedded />
        </>
      )}

      {mounted && segment === "outros" && <CommunityMarketsList embedded />}

      {mounted && segment === "transito" && (
        <>
          {!isTrafficEndedTab && !trafficStateLoading && trafficState?.activeMarket && (
            <TrafficLiveHero market={trafficState.activeMarket} />
          )}
          {!isTrafficEndedTab &&
            !trafficStateLoading &&
            !trafficState?.activeMarket &&
            trafficState?.nextStartsAt != null && (
              <TrafficSlotWaiting
                nextStartsAt={trafficState.nextStartsAt}
                lastEndedAt={trafficState.lastEndedAt}
              />
            )}
          {!isTrafficEndedTab &&
            trafficState?.recentEnded &&
            trafficState.recentEnded.length > 0 &&
            statusKey !== "ended" && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {copy.traffic.recentEndedTitle}
                </h2>
                <div className="grid gap-2 md:grid-cols-2">
                  {trafficState.recentEnded.slice(0, 3).map((m) => (
                    <TrafficEndedCard key={m.id} market={m} />
                  ))}
                </div>
              </section>
            )}

          {isTrafficEndedTab && (
            <div className="space-y-3">
              {endedSlotsLoading && (
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <MarketCardSkeleton key={`ended-sk-${i}`} />
                  ))}
                </div>
              )}
              {!endedSlotsLoading && (endedSlots?.length ?? 0) === 0 && (
                <EmptyState
                  icon={Clock}
                  title="Nenhum evento encerrado"
                  description="Slots finalizados aparecem aqui com o resultado medido."
                />
              )}
              {!endedSlotsLoading &&
                (endedSlots ?? []).map((m) => <TrafficEndedCard key={m.id} market={m} />)}
            </div>
          )}

          <div className="page-section flex flex-wrap items-end justify-between gap-4">
            <p className="w-full min-w-0 flex-1 text-sm text-muted-foreground sm:min-w-[200px]">
              <span className="font-medium text-foreground">{list.length} mercados</span> · pools
              atualizando ao vivo
            </p>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Buscar mercado ou via..."
                className="w-full rounded-xl border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </div>
          </div>

          {regionFilter && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Filtrando por região:</span>
              <span className="font-medium text-primary">{regionFilter}</span>
              <button
                type="button"
                onClick={() => patchSearch({ region: undefined })}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" /> Limpar
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(() => {
              const isHot =
                statusKey === "live" &&
                sortKey === "trend" &&
                !category &&
                !showFavorites &&
                !hasPosition &&
                !aiPicks &&
                !regionFilter;
              const isClosing =
                statusKey === "closing" &&
                sortKey === "closing" &&
                !category &&
                !showFavorites &&
                !hasPosition &&
                !aiPicks;
              const isAi = aiPicks;
              const isMyRegion = !!userRegion && regionFilter === userRegion;
              const presets = [
                {
                  key: "hot",
                  label: "Em Alta",
                  icon: <TrendingUp className="size-3" />,
                  active: isHot,
                  onClick: () =>
                    patchSearch({
                      status: "live",
                      sort: "trend",
                      category: undefined,
                      aiPicks: undefined,
                      favorites: undefined,
                      hasPosition: undefined,
                      region: undefined,
                    }),
                },
                {
                  key: "closing",
                  label: "Encerrando",
                  icon: <Clock className="size-3" />,
                  active: isClosing,
                  onClick: () =>
                    patchSearch({
                      status: "closing",
                      sort: "closing",
                      category: undefined,
                      aiPicks: undefined,
                      favorites: undefined,
                      hasPosition: undefined,
                    }),
                },
                {
                  key: "ai",
                  label: "IA Indica",
                  icon: <Bot className="size-3" />,
                  active: isAi,
                  onClick: () =>
                    patchSearch({
                      aiPicks: aiPicks ? undefined : "1",
                      status: "live",
                      sort: "edge",
                      category: undefined,
                      favorites: undefined,
                      hasPosition: undefined,
                    }),
                },
                ...(userRegion
                  ? [
                      {
                        key: "region",
                        label: userRegion,
                        icon: <MapPin className="size-3" />,
                        active: isMyRegion,
                        onClick: () =>
                          patchSearch({
                            region: isMyRegion ? undefined : userRegion,
                            aiPicks: undefined,
                          }),
                      },
                    ]
                  : []),
              ];
              return presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={p.onClick}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    p.active
                      ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow-primary)]"
                      : p.key === "ai"
                        ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                        : "border-border bg-card text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  {p.icon} {p.label}
                </button>
              ));
            })()}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                patchSearch(
                  {
                    favorites: showFavorites ? undefined : "1",
                    status: undefined,
                    category: undefined,
                    aiPicks: undefined,
                  },
                  "favorites_toggle",
                )
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
                showFavorites
                  ? "border-warn/60 bg-warn/15 text-warn shadow-[0_0_8px_var(--color-warn,#f59e0b)]"
                  : "border-border bg-card text-muted-foreground hover:bg-surface-2",
              )}
            >
              <Star className={cn("size-3", showFavorites && "fill-warn")} />
              Favoritos {watchlist.length > 0 && `(${watchlist.length})`}
            </button>
            {!showFavorites && (
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-surface-2"
                  >
                    <SlidersHorizontal className="size-3" />
                    Filtros avançados
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[78vh] overflow-auto">
                  <SheetHeader>
                    <SheetTitle>Filtros de mercados</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                        Status
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {statusFilters.map((f) => (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() =>
                              patchSearch(
                                {
                                  status: f.key === "all" ? undefined : f.key,
                                  category: undefined,
                                  favorites: undefined,
                                },
                                "status_filter",
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs transition",
                              statusKey === f.key && !category
                                ? "border-primary/60 bg-primary/15 text-primary shadow-[var(--shadow-glow-primary)]"
                                : "border-border bg-card text-muted-foreground hover:bg-surface-2",
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {userId && (
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                          Posições
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            patchSearch(
                              {
                                hasPosition: hasPosition ? undefined : "1",
                                favorites: undefined,
                              },
                              "positions_filter",
                            )
                          }
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs transition",
                            hasPosition
                              ? "border-primary/60 bg-primary/15 text-primary"
                              : "border-border bg-card text-muted-foreground hover:bg-surface-2",
                          )}
                        >
                          Minhas posições {openMarketIds.size > 0 && `(${openMarketIds.size})`}
                        </button>
                      </div>
                    )}
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                        Ordenar
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            { key: "trend" as const, label: copy.markets.sortTrend },
                            { key: "edge" as const, label: copy.markets.sortEdge },
                            { key: "closing" as const, label: "Encerrando" },
                          ] as const
                        ).map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() =>
                              patchSearch(
                                { sort: sortKey === s.key ? undefined : s.key },
                                "sort_filter",
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs transition",
                              sortKey === s.key
                                ? "border-primary/60 bg-primary/15 text-primary"
                                : "border-border bg-card text-muted-foreground hover:bg-surface-2",
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                        Categoria
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MARKET_CATEGORY_FILTERS.map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() =>
                              patchSearch(
                                { category: category === f ? undefined : f, favorites: undefined },
                                "category_filter",
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs transition",
                              category === f
                                ? "border-primary/60 bg-primary/15 text-primary shadow-[var(--shadow-glow-primary)]"
                                : "border-border bg-card text-muted-foreground hover:bg-surface-2",
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>

          {isRegistered && hasDeposited === false && (
            <div className="md:hidden sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 rounded-xl border border-primary/35 bg-card/95 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Reforce saldo para entrar nos mercados mais quentes.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    trackProductEvent("click_deposit", {
                      source: "markets_sticky_cta",
                      segment,
                    });
                    navigate({ to: "/wallet", search: { tab: "deposit" } });
                  }}
                  className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                >
                  Depositar e apostar
                </button>
              </div>
            </div>
          )}

          {aiPicks && !marketsLoading && (
            <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/8 px-3 py-2.5 text-sm">
              <Brain className="size-4 shrink-0 text-primary mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  UrbanMind filtrou {list.length} mercado{list.length !== 1 ? "s" : ""}
                </span>{" "}
                com confiança ≥ 75% e edge positivo. Precisão histórica:{" "}
                <span className="font-medium text-primary">78.4%</span>
              </p>
            </div>
          )}

          {showFavorites && watchlist.length === 0 && (
            <EmptyState
              icon={Star}
              title={copy.empty.favorites.title}
              description={copy.empty.favorites.description}
              action={{
                label: copy.empty.favorites.cta,
                to: "/markets",
                search: { status: "live" },
              }}
            />
          )}

          {!isTrafficEndedTab && !showFavorites && list.length === 0 && (
            <div className="space-y-4">
              <EmptyState
                icon={Search}
                title={copy.empty.markets.title}
                description={copy.empty.markets.description}
              />
              <div className="flex flex-col items-center gap-2 text-sm">
                {regionFilter && (
                  <button
                    type="button"
                    onClick={() => patchSearch({ region: undefined })}
                    className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20"
                  >
                    <MapPin className="size-3.5" />
                    Ver todos os mercados (sem filtro de região)
                  </button>
                )}
                {statusKey === "closing" && (
                  <button
                    type="button"
                    onClick={() => patchSearch({ status: "live" })}
                    className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20"
                  >
                    <TrendingUp className="size-3.5" />
                    Ver mercados ao vivo
                  </button>
                )}
                <a
                  href="/urbanmind"
                  className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  <Brain className="size-3.5" />
                  Deixa a IA escolher para você →
                </a>
                <button
                  type="button"
                  onClick={() =>
                    patchSearch({
                      status: undefined,
                      category: undefined,
                      hasPosition: undefined,
                      sort: undefined,
                      q: undefined,
                      region: undefined,
                      aiPicks: undefined,
                    })
                  }
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Limpar todos os filtros
                </button>
              </div>
              {markets.length > 0 && (
                <div className="mt-2">
                  <p className="mb-3 text-xs text-muted-foreground text-center">
                    Você pode gostar de…
                  </p>
                  <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                    {[...markets]
                      .sort((a, b) => b.pool.YES + b.pool.NO - (a.pool.YES + a.pool.NO))
                      .slice(0, 3)
                      .map((m) => (
                        <MarketCard key={m.id} m={m} compact />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {marketsError && (
            <InlineError
              message="Não foi possível carregar os mercados."
              onRetry={() => refetch()}
            />
          )}

          {marketsLoading && !marketsError && (
            <>
              <div className="md:hidden space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <MarketCardSkeleton key={i} />
                ))}
              </div>
              <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <MarketCardSkeleton key={i} />
                ))}
              </div>
            </>
          )}

          {!isTrafficEndedTab && !marketsLoading && !marketsError && (
            <>
              <MobileMarketsCarousel
                markets={list}
                className="md:hidden"
                onOpen={(marketId) =>
                  trackProductEvent("market_card_click", {
                    source: "markets_mobile_carousel",
                    marketId,
                    segment,
                  })
                }
              />
              <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
                {list.map((m) => (
                  <MarketCard
                    key={m.id}
                    m={m}
                    onOpen={(marketId) =>
                      trackProductEvent("market_card_click", {
                        source: "markets_grid",
                        marketId,
                        segment,
                      })
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
