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
import { Search, Star, X, TrendingUp, Clock, Bot, MapPin } from "lucide-react";
import { EmptyState } from "@/components/viax/empty-state";
import { cn } from "@/lib/utils";
import { loadMarketsFilters, saveMarketsFilters } from "@/lib/markets-filter-persist";
import { isOpenBetStatus, isSettledDisplay } from "@/lib/market-status";
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
      status === "draft"
        ? status
        : undefined;
    const cat = search.category;
    const validCat = MARKET_CATEGORY_FILTERS.includes(cat as MarketCategoryFilter)
      ? (cat as MarketCategoryFilter)
      : undefined;
    const view = search.view === "community" ? "community" : "urban";
    return {
      view,
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

function MarketsList() {
  const navigate = useNavigate({ from: "/markets/" });
  const search = Route.useSearch();
  const { userId, isRegistered } = useAuthPublic();
  const { data: profile } = useProfile(userId);
  const { data: hasDeposited } = useHasDeposited(userId);
  const markets = useCatalogMarkets();
  const { isLoading: marketsLoading, error: marketsError, refetch } = useMarkets();
  const queryClient = useQueryClient();
  const statusFilters = profile?.isAdmin ? [...baseStatusFilters, draftFilter] : baseStatusFilters;
  const { ids: watchlist } = useWatchlist();
  const { data: bets } = useBets({ enabled: Boolean(userId) });
  const openMarketIds = useMemo(
    () =>
      new Set((bets ?? []).filter((b) => isOpenBetStatus(b.marketStatus)).map((b) => b.marketId)),
    [bets],
  );

  const view = search.view ?? "urban";
  const statusKey = search.status ?? "all";
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

  useEffect(() => setQInput(q), [q]);

  useEffect(() => {
    if (hydrated) return;
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
      }
    }
    setHydrated(true);
  }, [hydrated, search, navigate]);

  useEffect(() => {
    if (!hydrated) return;
    saveMarketsFilters(search);
  }, [hydrated, search.status, search.category, search.sort, search.hasPosition]);

  const patchSearch = (patch: Partial<MarketsSearch>) => {
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
      if (qInput !== (search.q ?? "")) patchSearch({ q: qInput || undefined });
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const list = useMemo(() => {
    const filtered = markets.filter((m) => {
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
  ]);

  if (view === "community") {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 border-b pb-2">
          <button
            type="button"
            onClick={() => patchSearch({ view: "urban" })}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface"
          >
            {copy.markets.urbanTab}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              "bg-primary/15 text-primary",
            )}
          >
            {copy.markets.communityTab}
          </button>
        </div>
        <CommunityMarketsList />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isRegistered && hasDeposited === false && <DepositPromptBanner />}

      <div className="flex gap-2 border-b pb-2">
        <button
          type="button"
          className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", "bg-primary/15 text-primary")}
        >
          {copy.markets.urbanTab}
        </button>
        <button
          type="button"
          onClick={() => patchSearch({ view: "community" })}
          className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface"
        >
          {copy.markets.communityTab}
        </button>
      </div>
      <div className="page-section flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title={<span className="text-highlight">Mercados</span>}
          description={
            <>
              <span className="text-emphasis">{list.length} mercados</span> · pools atualizando ao
              vivo
            </>
          }
          className="flex-1 min-w-[200px]"
        />
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
                  : "border-border bg-card text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {p.icon} {p.label}
            </button>
          ));
        })()}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            patchSearch({
              favorites: showFavorites ? undefined : "1",
              status: undefined,
              category: undefined,
              aiPicks: undefined,
            })
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
        {!showFavorites &&
          statusFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() =>
                patchSearch({
                  status: f.key === "all" ? undefined : f.key,
                  category: undefined,
                  favorites: undefined,
                })
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
        {!showFavorites && userId && (
          <button
            type="button"
            onClick={() =>
              patchSearch({ hasPosition: hasPosition ? undefined : "1", favorites: undefined })
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
        )}
        {!showFavorites &&
          (
            [
              { key: "trend" as const, label: copy.markets.sortTrend },
              { key: "edge" as const, label: copy.markets.sortEdge },
              { key: "closing" as const, label: "Encerrando" },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => patchSearch({ sort: sortKey === s.key ? undefined : s.key })}
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
        {!showFavorites &&
          MARKET_CATEGORY_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() =>
                patchSearch({ category: category === f ? undefined : f, favorites: undefined })
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

      {showFavorites && watchlist.length === 0 && (
        <EmptyState
          icon={Star}
          title={copy.empty.favorites.title}
          description={copy.empty.favorites.description}
          action={{ label: copy.empty.favorites.cta, to: "/markets", search: { status: "live" } }}
        />
      )}

      {!showFavorites && list.length === 0 && (
        <div className="space-y-3">
          <EmptyState
            icon={Search}
            title={copy.empty.markets.title}
            description={copy.empty.markets.description}
            action={{
              label: copy.empty.markets.cta,
              to: "/markets",
              search: { status: "live" },
            }}
          />
          <p className="text-center">
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
              Limpar filtros
            </button>
          </p>
        </div>
      )}

      {marketsError && (
        <InlineError message="Não foi possível carregar os mercados." onRetry={() => refetch()} />
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

      {!marketsLoading && !marketsError && (
        <>
          <MobileMarketsCarousel markets={list} className="md:hidden" />
          <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
            {list.map((m) => (
              <MarketCard key={m.id} m={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
