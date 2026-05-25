import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SettingsPanel } from "@/components/viax/settings-panel";
import { PositionsPanel } from "@/components/viax/positions-panel";
import { WalletPanel } from "@/components/viax/wallet-panel";
import { useViaX } from "@/store/viax-store";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useAchievements } from "@/hooks/use-achievements";
import { useResolvedMarkets, useResolvedTransactions } from "@/hooks/use-resolved-data";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePnlSeries } from "@/hooks/use-pnl-series";
import { useActivityCalendar } from "@/hooks/use-activity-calendar";
import { DivisionBadge } from "@/components/viax/division-badge";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { MarketCard } from "@/components/viax/market-card";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { Lock, ShieldCheck, AlertTriangle, Star, MapPin } from "lucide-react";
import { useBets } from "@/hooks/use-bets";
import { useRegionPerformance } from "@/hooks/use-region-performance";
import { TraderArchetypeCard } from "@/components/viax/trader-archetype-card";
import { EmptyState } from "@/components/viax/empty-state";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { useMyCommunityMarkets } from "@/hooks/use-community-markets";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
export type ProfileSearch = {
  tab?: "visao" | "posicoes" | "carteira" | "favoritos" | "badges" | "atividade" | "mercados" | "config";
};

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Perfil · ViaX" },
      { name: "description", content: "Seu perfil, badges, divisão e histórico na ViaX." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ProfileSearch => {
    const t = search.tab;
    if (
      t === "posicoes" ||
      t === "carteira" ||
      t === "favoritos" ||
      t === "badges" ||
      t === "atividade" ||
      t === "mercados" ||
      t === "config"
    )
      return { tab: t };
    return { tab: "visao" };
  },
  component: Profile,
});

const profileTabs = [
  { key: "visao" as const, label: "Visão geral" },
  { key: "posicoes" as const, label: "Posições" },
  { key: "carteira" as const, label: "Carteira" },
  { key: "favoritos" as const, label: "Favoritos" },
  { key: "badges" as const, label: "Badges" },
  { key: "atividade" as const, label: "Atividade" },
  { key: "mercados" as const, label: "Meus mercados" },
  { key: "config" as const, label: "Configurações" },
];

function Profile() {
  const navigate = useNavigate({ from: "/profile" });
  const { tab = "visao" } = Route.useSearch();
  const zustandMe = useViaX((s) => s.me);
  const { userId, isRegistered, isAnonymous, email } = useAuth();
  const { data: dbProfile } = useProfile(userId);
  const { data: achievements = [] } = useAchievements(userId);
  const me = dbProfile
    ? {
        name: dbProfile.name,
        handle: dbProfile.handle,
        avatar: dbProfile.avatar,
        balance: dbProfile.balance,
        xp: dbProfile.xp,
        xpToNext: dbProfile.xpToNext,
        division: dbProfile.division,
        streak: dbProfile.streak,
        volume24h: dbProfile.volume24h,
        accuracy: dbProfile.accuracy,
        roi: dbProfile.roi,
        pnl: dbProfile.pnl,
      }
    : zustandMe;
  const { transactions } = useResolvedTransactions();
  const pnl = usePnlSeries(transactions);
  const calendar = useActivityCalendar(transactions);
  const { data: allBets } = useBets();
  const regionPerf = useRegionPerformance(allBets);
  const { markets } = useResolvedMarkets();
  const { ids: watchlist } = useWatchlist();
  const favMarkets = markets.filter((m) => watchlist.includes(m.id));
  const chartData =
    pnl.length > 0
      ? pnl
      : Array.from({ length: 30 }, (_, i) => ({ d: i, v: me.pnl * (i / 29), label: "" }));

  const xpPct = (me.xp / me.xpToNext) * 100;

  return (
    <div className="space-y-6">
      {isAnonymous && !isRegistered && (
        <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <div className="flex-1 text-sm">
            <span className="font-medium text-warn">Conta sem cadastro formal</span>
            <span className="ml-1 text-muted-foreground">
              — crie e-mail e senha para não perder saldo e histórico.
            </span>
          </div>
          <AuthModalTrigger
            mode="signup"
            upgrade
            className="shrink-0 rounded-xl border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs font-medium text-warn hover:bg-warn/20"
          >
            {copy.auth.registerCta}
          </AuthModalTrigger>
        </div>
      )}

      {isRegistered && email && (
        <div className="flex items-center gap-2 rounded-xl border border-up/30 bg-up/5 px-4 py-2.5 text-sm">
          <ShieldCheck className="size-4 text-up" />
          <span className="text-muted-foreground">Conta registrada</span>
          <span className="font-medium">{email}</span>
        </div>
      )}

      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card/60 to-card/40 p-6 backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <img src={me.avatar} className="size-20 rounded-2xl border bg-surface" alt={me.name} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="heading-page text-2xl">
                <span className="text-highlight">{me.name}</span>
              </h1>
              <DivisionBadge division={me.division} />
            </div>
            <div className="text-sm text-muted-foreground">
              @{me.handle} · São Paulo · Pinheiros
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-glow shadow-[var(--shadow-glow-primary)]"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
              <span className="mono text-xs">
                <AnimatedNumber value={me.xp} /> / {me.xpToNext} XP
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI
            label={copy.profile.precision}
            value={
              <>
                <AnimatedNumber value={me.accuracy * 100} decimals={1} />%
              </>
            }
          />
          <KPI
            label={copy.profile.totalReturn}
            value={
              <span className="text-up">
                <AnimatedNumber value={me.roi * 100} decimals={1} />%
              </span>
            }
          />
          <KPI
            label="Lucro acumulado"
            value={<AnimatedNumber value={me.pnl} format={formatBRL} />}
          />
          <KPI label="Streak" value={<>🔥 {me.streak}</>} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {profileTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() =>
              navigate({ search: { tab: t.key === "visao" ? undefined : t.key }, replace: true })
            }
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              tab === t.key
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-surface-2",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "mercados" && <ProfileMyMarketsTab isRegistered={isRegistered} />}

      {tab === "config" && <SettingsPanel />}
      {tab === "posicoes" && <PositionsPanel embedded />}
      {tab === "carteira" && <WalletPanel embedded />}

      {tab === "visao" && <TraderArchetypeCard />}

      {(tab === "visao" || tab === "atividade") && (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="surface-card">
            <h2 className="heading-section">
              Ganhos · <span className="text-highlight">60 dias</span>
            </h2>
            <div className="mt-3" style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="pf" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-up)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-up)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="d"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
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
                    dataKey="v"
                    stroke="var(--color-up)"
                    strokeWidth={1.8}
                    fill="url(#pf)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface-card">
            <h2 className="heading-section">
              Atividade · <span className="text-highlight">12 semanas</span>
            </h2>
            <div className="mt-4 grid grid-cols-12 gap-1">
              {calendar.map((v, i) => (
                <div
                  key={i}
                  className={cn(
                    "aspect-square rounded-[3px] transition",
                    v > 0.85
                      ? "bg-primary shadow-[var(--shadow-glow-primary)]"
                      : v > 0.6
                        ? "bg-primary/70"
                        : v > 0.35
                          ? "bg-primary/40"
                          : v > 0.15
                            ? "bg-primary/20"
                            : "bg-surface-2",
                  )}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Menos</span>
              <div className="flex gap-1">
                {[0.1, 0.3, 0.5, 0.8].map((o) => (
                  <span
                    key={o}
                    className="size-2 rounded-[2px] bg-primary"
                    style={{ opacity: o }}
                  />
                ))}
              </div>
              <span>Mais</span>
            </div>
          </div>
        </div>
      )}

      {tab === "visao" && regionPerf.length > 0 && (
        <div className="surface-card">
          <div className="flex items-center justify-between">
            <h2 className="heading-section flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              Precisão por <span className="text-highlight ml-1">região</span>
            </h2>
            <span className="text-xs text-muted-foreground">
              {regionPerf.length} regiões · últimas {allBets?.length ?? 0} previsões
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Região onde você mais acerta:{" "}
            <Link
              to="/markets"
              search={{ region: regionPerf[0].region }}
              className="font-medium text-primary hover:underline"
            >
              {regionPerf[0].region} ({(regionPerf[0].accuracy * 100).toFixed(0)}%)
            </Link>
          </p>
          <div className="mt-4" style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={regionPerf} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="region"
                  width={90}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Precisão"]}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                  {regionPerf.map((entry, i) => (
                    <Cell
                      key={entry.region}
                      fill={i === 0 ? "var(--color-up)" : "var(--color-primary)"}
                      opacity={i === 0 ? 1 : 0.6 - i * 0.08}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(tab === "visao" || tab === "favoritos") && (
        <div>
          <h2 className="heading-subsection mb-3 flex items-center gap-2">
            <Star className="size-3.5 fill-warn text-warn" /> Mercados{" "}
            <span className="text-highlight">favoritos</span>
          </h2>
          {favMarkets.length === 0 ? (
            <EmptyState
              icon={Star}
              title={copy.empty.profileFavorites.title}
              description={copy.empty.profileFavorites.description}
              action={{ label: copy.empty.profileFavorites.cta, to: "/markets" }}
              compact
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favMarkets.map((m) => (
                <MarketCard key={m.id} m={m} />
              ))}
            </div>
          )}
        </div>
      )}

      {(tab === "visao" || tab === "badges") && (
        <div>
          <h2 className="heading-subsection mb-3">
            <span className="text-highlight">Badges</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {achievements.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "rounded-2xl border p-4",
                  b.unlocked
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-card/40 opacity-60",
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "size-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow",
                      !b.unlocked && "grayscale",
                    )}
                  />
                  {!b.unlocked && <Lock className="size-3.5 text-muted-foreground" />}
                </div>
                <div className="mt-3 text-sm font-medium">{b.name}</div>
                <div className="text-[11px] text-muted-foreground">{b.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function ProfileMyMarketsTab({ isRegistered }: { isRegistered: boolean }) {
  const { data: myMarkets = [], isLoading } = useMyCommunityMarkets(isRegistered);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{copy.community.listSubtitle}</p>
        <Link
          to="/markets/create"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          {copy.community.createLink}
        </Link>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">{copy.auth.loading}</p>}
      {!isLoading && myMarkets.length === 0 && (
        <EmptyState
          title={copy.empty.markets.title}
          description={copy.community.listSubtitle}
          action={{ label: copy.community.createLink, to: "/markets/create" }}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {myMarkets.map((m) => (
          <MarketCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card/40 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
