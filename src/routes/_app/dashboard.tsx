import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useEffect } from "react";
import { useRegions } from "@/hooks/use-regions";
import { findTopMarketForRegion } from "@/lib/region-market";
import { toast } from "sonner";
import { useViaX } from "@/store/viax-store";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { useBets } from "@/hooks/use-bets";
import { isOpenBetStatus } from "@/lib/market-status";
import { useMarkets } from "@/hooks/use-markets";
import { useTransactions } from "@/hooks/use-transactions";
import { useTraders } from "@/hooks/use-traders";
import { usePnlSeries } from "@/hooks/use-pnl-series";
import { MarketCard } from "@/components/viax/market-card";
import { CityHeatmap } from "@/components/viax/city-heatmap";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { formatBRL, PRIZE_RATIO } from "@/lib/parimutuel";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnonAccountBanner } from "@/components/viax/anon-account-banner";
import { ArrowUpRight, Brain, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { copy } from "@/copy/pt-BR";
import { buildActionNowItems } from "@/lib/action-now";

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
  const navigate = useNavigate();
  const { from, highlight } = Route.useSearch();
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const zustandMe = useViaX((s) => s.me);
  const me = profile ?? zustandMe;

  const { data: dbMarkets } = useMarkets();
  const zustandMarkets = useViaX((s) => s.markets);
  const markets = dbMarkets ?? zustandMarkets;
  const { data: dbRegions } = useRegions();
  const zustandRegions = useViaX((s) => s.regions);
  const regions = dbRegions ?? zustandRegions;
  const feed = useViaX((s) => s.feed);

  useEffect(() => {
    if (from === "landing") {
      toast.message(copy.dashboard.welcomeToast, {
        description: copy.dashboard.welcomeToastDesc,
      });
      navigate({ search: {}, replace: true });
    }
  }, [from, navigate]);

  useEffect(() => {
    if (highlight !== "position") return;
    const el = document.getElementById("open-positions");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    navigate({ search: (prev) => ({ ...prev, highlight: undefined }), replace: true });
  }, [highlight, navigate]);

  const { data: bets } = useBets();
  const openBets = (bets ?? []).filter((b) => isOpenBetStatus(b.marketStatus));
  const topOpen = openBets.slice(0, 3);

  const { data: dbTx } = useTransactions();
  const zustandTx = useViaX((s) => s.transactions);
  const transactions = dbTx ?? zustandTx;
  const pnlSeries = usePnlSeries(transactions);

  const { data: dbTraders } = useTraders();
  const zustandTraders = useViaX((s) => s.traders);
  const traders = dbTraders ?? zustandTraders;
  const myRank = useMemo(() => {
    if (!userId || !traders.length) return null;
    const idx = traders.findIndex((t) => t.id === userId);
    return idx >= 0 ? idx + 1 : null;
  }, [traders, userId]);

  const liveCount = markets.filter((m) => m.status === "live" || m.status === "closing").length;
  const top = [...markets].sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend)).slice(0, 4);
  const urbanMindMarket = markets.find((m) => m.id === "paulista-rush") ?? markets[0];
  const actionNow = buildActionNowItems(openBets, markets, urbanMindMarket);

  const pnlTotal = pnlSeries.length ? pnlSeries[pnlSeries.length - 1].v : "pnl" in me ? me.pnl : 0;
  const pnlStart = pnlSeries.length > 1 ? pnlSeries[0].v : 0;
  const pnlDelta = pnlTotal - pnlStart;
  const pnlPct = pnlStart !== 0 ? ((pnlDelta / Math.abs(pnlStart)) * 100).toFixed(1) : null;

  const chartData = pnlSeries.length
    ? pnlSeries.map((p) => ({ d: p.label, pnl: p.v }))
    : [{ d: "—", pnl: 0 }];

  return (
    <div className="space-y-6">
      <AnonAccountBanner />

      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {copy.dashboard.greeting(me.name.split(" ")[0])}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {liveCount} mercados ao vivo
              {urbanMindMarket ? (
                <>
                  {" "}
                  · UrbanMind confiança {(urbanMindMarket.aiPrediction.confidence * 100).toFixed(0)}
                  %
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link to="/profile" search={{ tab: "carteira" }}>
            <KPI
              label="Saldo"
              value={<AnimatedNumber value={me.balance} format={formatBRL} />}
              clickable
            />
          </Link>
          <Link to="/profile" search={{ tab: "carteira" }}>
            <KPI
              label={copy.dashboard.profit24h}
              value={
                <span className={cn(("pnl" in me ? me.pnl : 0) >= 0 ? "text-up" : "text-down")}>
                  <AnimatedNumber value={"pnl" in me ? me.pnl : 0} format={formatBRL} />
                </span>
              }
              sub={profile ? "Atualizado em tempo real" : undefined}
              clickable
            />
          </Link>
          <Link to="/profile">
            <KPI
              label={copy.dashboard.precision}
              value={
                <AnimatedNumber
                  value={("accuracy" in me ? me.accuracy : 0.5) * 100}
                  decimals={1}
                  suffix="%"
                />
              }
              sub={copy.dashboard.precisionSub}
              clickable
            />
          </Link>
          <Link to="/ranking">
            <KPI
              label="Ranking"
              value={
                myRank ? (
                  <span className="mono">#{myRank}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )
              }
              sub={
                myRank && traders.length
                  ? `Top ${((myRank / traders.length) * 100).toFixed(1)}%`
                  : "Explore o ranking"
              }
              clickable
            />
          </Link>
        </div>
      </div>

      {actionNow.length > 0 && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-primary">
            {copy.dashboard.actionNow}
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
                    <span className="text-[10px] uppercase text-muted-foreground">
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
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {copy.ia.closingWithIa}
                    </span>
                    <div className="line-clamp-1 font-medium">{item.market.question}</div>
                  </Link>
                );
              }
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
            })}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Mercados em alta
            </h2>
            <Link
              to="/markets"
              search={{ status: "live" }}
              className="text-xs text-primary hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {top.map((m) => (
              <MarketCard key={m.id} m={m} />
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {copy.dashboard.performance}
            </h2>
            <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
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
              <div style={{ width: "100%", height: 140 }}>
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="pn" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-up)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-up)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="d" hide={chartData.length > 8} tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pnl"
                      stroke="var(--color-up)"
                      strokeWidth={1.6}
                      fill="url(#pn)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {!pnlSeries.length && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  {copy.dashboard.gainsChartHint}
                </p>
              )}
            </div>
          </div>

          {urbanMindMarket && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Brain className="size-4" />
                <span className="text-xs uppercase tracking-wider">UrbanMind AI</span>
              </div>
              <p className="mt-2 text-sm">
                UrbanMind prevê{" "}
                <span className="mono text-foreground">
                  {urbanMindMarket.aiPrediction.value.toLocaleString("pt-BR")}
                </span>{" "}
                em {urbanMindMarket.region}, sinal{" "}
                <span
                  className={cn(
                    "mono font-medium",
                    urbanMindMarket.aiPrediction.side === "YES" ? "text-up" : "text-down",
                  )}
                >
                  {urbanMindMarket.aiPrediction.side === "YES" ? "SIM" : "NÃO"}
                </span>{" "}
                · {(urbanMindMarket.aiPrediction.confidence * 100).toFixed(0)}% confiança.
              </p>
              <Link
                to="/markets/$marketId"
                params={{ marketId: urbanMindMarket.id }}
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {copy.dashboard.operateMarket} <ArrowUpRight className="size-3" />
              </Link>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Feed
            </h2>
            <div className="space-y-2">
              {feed.slice(0, 4).map((p) => (
                <Link
                  to="/feed"
                  key={p.id}
                  className="block rounded-xl border bg-card/60 p-3 backdrop-blur hover:bg-surface/60"
                >
                  <div className="flex items-center gap-2">
                    <img src={p.user.avatar} className="size-7 rounded-full bg-surface" alt="" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">
                        {p.user.name}{" "}
                        <span className="text-muted-foreground">@{p.user.handle}</span>
                      </div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">{p.text}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(p.time, { locale: ptBR, addSuffix: false })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Mapa da cidade
          </h2>
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
        </div>
        <div id="open-positions">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Suas posições abertas
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
              <div className="rounded-xl border bg-card/60 p-4 text-center text-sm text-muted-foreground backdrop-blur">
                {copy.positions.emptyOpen}{" "}
                <Link
                  to="/markets"
                  search={{ status: "live" }}
                  className="text-primary hover:underline"
                >
                  {copy.positions.explore} →
                </Link>
              </div>
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
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  clickable,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  clickable?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/60 p-4 backdrop-blur transition",
        clickable && "hover:bg-surface/60 hover:border-primary/30 cursor-pointer",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <TrendingUp className="size-3" /> {label}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
