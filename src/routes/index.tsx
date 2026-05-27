import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, lazy, Suspense, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  Activity,
  Brain,
  Users,
  Map,
  BarChart3,
  Zap,
  Trophy,
  Radio,
  Flag,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useViaX } from "@/store/viax-store";
import { useCatalogMarkets } from "@/hooks/use-markets";
import { useRealtimeTick } from "@/hooks/use-realtime-tick";
import { MarketCard } from "@/components/viax/market-card";
import { MobileMarketsCarousel } from "@/components/viax/mobile-markets-carousel";
import { Ticker } from "@/components/viax/ticker";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { Sparkline } from "@/components/viax/sparkline";
import { Logo } from "@/components/viax/sidebar";
import { KpiTile } from "@/components/viax/kpi-tile";
import { DivisionBadge } from "@/components/viax/division-badge";
import { copy } from "@/copy/pt-BR";
import { formatBRL, formatCompact, probability, prizePool } from "@/lib/parimutuel";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { PublicNav } from "@/components/viax/public-nav";
import { PublicMobileNav } from "@/components/viax/public-mobile-nav";
import { LandingSegmentPillars } from "@/components/viax/landing-segment-pillars";
import { usePublicCommunityMarkets } from "@/hooks/use-community-markets";
import type { AuthModalSearch } from "@/lib/auth-modal-search";
import { parseAuthModalSearch } from "@/lib/auth-modal-search";

const CityHeatmap = lazy(() =>
  import("@/components/viax/city-heatmap").then((m) => ({ default: m.CityHeatmap })),
);
const LandingLiveMarkets = lazy(() =>
  import("@/components/viax/landing-live-markets").then((m) => ({
    default: m.LandingLiveMarkets,
  })),
);
const LandingAiAccuracyChart = lazy(() =>
  import("@/components/viax/landing-ai-accuracy-chart").then((m) => ({
    default: m.LandingAiAccuracyChart,
  })),
);

function SectionFallback({ className = "h-48" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface/60 ${className}`} />;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): AuthModalSearch =>
    parseAuthModalSearch(search),
  head: () => ({
    meta: [
      { title: copy.landing.metaTitle },
      { name: "description", content: copy.landing.metaDescription },
      { property: "og:title", content: copy.landing.ogTitle },
      { property: "og:description", content: copy.landing.ogDescription },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useRealtimeTick();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = "/markets?status=live";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("viax_onboarded")) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const markets = useCatalogMarkets();
  const { data: communityMarkets = [] } = usePublicCommunityMarkets();
  const traders = useViaX((s) => s.traders);
  const aiAcc = useViaX((s) => s.aiAccuracy);
  const totalVol = markets.reduce((a, m) => a + m.pool.YES + m.pool.NO, 0);
  const totalPart = markets.reduce((a, m) => a + m.participants, 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[640px] w-[1200px] -translate-x-1/2 bg-[var(--gradient-glow)]" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
              >
                <span className="size-1.5 rounded-full bg-primary animate-[pulse-glow_2s_ease-in-out_infinite]" />
                {copy.landing.badge}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="heading-page mt-6 text-4xl leading-[1.06] md:text-5xl lg:text-6xl"
              >
                <span className="text-highlight">{copy.landing.heroTitleLead}</span>{" "}
                {copy.landing.heroTitleTail}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lead mt-5 max-w-xl text-base"
              >
                {copy.landing.heroBody}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <AuthModalTrigger
                  mode="signup"
                  depositAfter
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-5 py-3 font-medium text-primary-foreground shadow-[var(--shadow-glow-primary)] transition hover:brightness-110"
                >
                  {copy.auth.registerCta}{" "}
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </AuthModalTrigger>
                <AuthModalTrigger
                  mode="login"
                  className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-surface-2"
                >
                  {copy.auth.loginCta}
                </AuthModalTrigger>
                <Link
                  to="/markets"
                  search={{ segment: "transito" }}
                  className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-surface-2"
                >
                  <Map className="size-4" />
                  {copy.landing.ctaTransito}
                </Link>
                <Link
                  to="/markets"
                  search={{ segment: "futebol" }}
                  className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-surface-2"
                >
                  <Flag className="size-4" />
                  {copy.landing.ctaFutebol}
                </Link>
                <Link
                  to="/markets"
                  search={{ segment: "outros" }}
                  className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-surface-2"
                >
                  <Sparkles className="size-4" />
                  {copy.landing.ctaOutros}
                </Link>
                <Link
                  to="/markets/create"
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  {copy.landing.createMarketCta}
                </Link>
              </motion.div>

              <div className="mt-10 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiTile
                  label="Volume 24h"
                  value={<AnimatedNumber value={totalVol} format={formatBRL} />}
                />
                <KpiTile
                  label="Trânsito ao vivo"
                  value={<AnimatedNumber value={markets.length} />}
                />
                <KpiTile
                  label={copy.landing.kpiCommunity}
                  value={<AnimatedNumber value={communityMarkets.length} />}
                />
                <KpiTile
                  label="Participantes"
                  value={<AnimatedNumber value={totalPart} format={formatCompact} />}
                />
              </div>
            </div>

            {/* Terminal mock */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TerminalMock />
            </motion.div>
          </div>
        </div>
        <Ticker />
      </section>

      <LandingSegmentPillars />

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader
          eyebrow={copy.landing.howUrbanEyebrow}
          title={
            <>
              Da rua para a <span className="text-highlight">previsão</span>, em poucos passos.
            </>
          }
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              i: Radio,
              t: copy.landing.step1,
              d: copy.landing.step1Desc,
            },
            {
              i: BarChart3,
              t: copy.landing.step2,
              d: copy.landing.step2Desc,
            },
            {
              i: Brain,
              t: copy.landing.step3,
              d: copy.landing.step3Desc,
            },
            {
              i: Trophy,
              t: copy.landing.step4,
              d: copy.landing.step4Desc,
            },
          ].map(({ i: Icon, t, d }, k) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: k * 0.06 }}
              className="surface-card"
            >
              <div className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="mt-4 font-medium">{t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <Suspense fallback={<SectionFallback className="h-64" />}>
        <LandingLiveMarkets />
      </Suspense>

      {/* AI vs HUMANS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="UrbanMind AI"
              title={
                <>
                  Sua leitura vs. a melhor <span className="text-highlight">IA urbana</span> do
                  país.
                </>
              }
              align="left"
            />
            <p className="mt-4 max-w-xl text-muted-foreground">{copy.landing.urbanMindLead}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <KpiTile label={copy.landing.kpiAiPrecision} value="78.4%" tone="primary" />
              <KpiTile label={copy.landing.kpiHumanPrecision} value="64.1%" />
              <KpiTile label="Mercados resolvidos" value="12.482" />
              <KpiTile label="Volume movimentado" value="18,4 mi BRL" />
            </div>
          </div>
          <Suspense fallback={<SectionFallback className="h-[280px]" />}>
            <LandingAiAccuracyChart data={aiAcc} />
          </Suspense>
        </div>
      </section>

      {/* LIVE MAP */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHeader
            eyebrow={copy.landing.mapSectionEyebrow}
            title={
              <>
                A cidade respira. Os <span className="text-highlight">mercados</span> também.
              </>
            }
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Suspense fallback={<SectionFallback className="h-[460px]" />}>
            <CityHeatmap height={460} />
          </Suspense>
            <div className="space-y-3">
              {markets.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border bg-card/60 p-3 backdrop-blur"
                >
                  <Sparkline
                    data={m.history.map((h) => h.p)}
                    stroke={m.trend >= 0 ? "var(--color-up)" : "var(--color-down)"}
                    width={84}
                    height={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{m.region}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {copy.landing.prizeTotal} {formatBRL(prizePool(m.pool))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-up">
                      {(probability(m.pool, "YES") * 100).toFixed(1)}%
                    </div>
                    <div className="mono text-[10px] text-down">
                      {((1 - probability(m.pool, "YES")) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* RANKINGS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader
          eyebrow="Rankings"
          title={
            <>
              Top <span className="text-highlight">traders urbanos</span> · esta semana
            </>
          }
        />
        <div className="surface-card mt-10 overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Trader</th>
                <th className="px-4 py-3 text-left">Divisão</th>
                <th className="px-4 py-3 text-right">{copy.landing.leaderboardAccuracy}</th>
                <th className="hidden sm:table-cell px-4 py-3 text-right">
                  {copy.landing.leaderboardReturn}
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-right">Volume</th>
                <th className="hidden md:table-cell px-4 py-3 text-right">Crescimento</th>
              </tr>
            </thead>
            <tbody>
              {traders.slice(0, 5).map((t, i) => (
                <tr key={t.id} className="border-t border-border/60 hover:bg-surface/40">
                  <td className="px-4 py-3 mono text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={t.avatar} className="size-8 rounded-full bg-surface" alt={t.name} />
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground">@{t.handle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DivisionBadge division={t.division} />
                  </td>
                  <td className="px-4 py-3 text-right mono">{(t.accuracy * 100).toFixed(1)}%</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-right mono text-up">
                    +{(t.roi * 100).toFixed(0)}%
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-right mono">
                    {formatBRL(t.volume)}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-right mono">
                    <span className={t.weeklyGrowth >= 0 ? "text-up" : "text-down"}>
                      {t.weeklyGrowth >= 0 ? "▲" : "▼"}{" "}
                      {(Math.abs(t.weeklyGrowth) * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-6 py-16 md:grid-cols-4">
          {[
            {
              l: "Volume diário",
              v: <AnimatedNumber value={totalVol} format={formatBRL} />,
              i: Activity,
            },
            { l: "Mercados ao vivo", v: <AnimatedNumber value={markets.length} />, i: Radio },
            { l: copy.landing.kpiAiPrecision, v: "78.4%", i: Brain },
            {
              l: "Traders ativos",
              v: <AnimatedNumber value={totalPart} format={formatCompact} />,
              i: Users,
            },
          ].map((s, i) => {
            const Icon = s.i;
            return (
              <div key={i} className="surface-card">
                <Icon className="size-4 text-primary" />
                <div className="mt-3 text-2xl font-semibold">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MOBILE */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="No celular"
              title={
                <>
                  Tudo no <span className="text-highlight">celular</span>.
                </>
              }
              align="left"
            />
            <p className="mt-4 max-w-xl text-muted-foreground">{copy.landing.mobileBody}</p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Bottom navigation com 5 atalhos",
                "Cards full-width com swipe",
                "Animações 60 fps",
                "Notificações inteligentes",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Zap className="size-4 text-primary" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto flex w-full max-w-sm justify-center">
            <PhoneMock />
          </div>
        </div>
      </section>

      <PublicMobileNav />

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span>ViaX · Inteligência urbana em tempo real</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-5">
            <Link to="/markets" search={{ segment: "transito" }}>
              {copy.landing.ctaTransito}
            </Link>
            <Link to="/markets" search={{ segment: "futebol" }}>
              {copy.landing.ctaFutebol}
            </Link>
            <Link to="/markets" search={{ segment: "outros" }}>
              {copy.landing.ctaOutros}
            </Link>
            <Link to="/ranking">Ranking</Link>
            <Link to="/urbanmind">UrbanMind</Link>
            <Link to="/dashboard">{copy.landing.footerTerminal}</Link>
          </div>
        </div>
      </footer>

      <Outlet />
    </div>
  );
}

function Nav() {
  return <PublicNav variant="landing" />;
}

function SectionHeader({
  eyebrow,
  title,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <div className="text-xs uppercase tracking-[0.18em] text-primary">{eyebrow}</div>
      <h2 className="heading-page mt-2 text-3xl md:text-4xl">{title}</h2>
    </div>
  );
}

function TerminalMock() {
  const markets = useCatalogMarkets();
  const top = markets[0];
  if (!top) return null;
  return (
    <Link
      to="/markets/$marketId"
      params={{ marketId: top.id }}
      search={{ side: top.aiPrediction.side }}
      className="block rounded-2xl border bg-card/70 p-1 shadow-[var(--shadow-elevated)] backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-glow-primary)]"
    >
      <div className="rounded-xl bg-gradient-to-br from-surface/80 to-surface-2/40 p-5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-up animate-[pulse-glow_2s_ease-in-out_infinite]" />{" "}
            {copy.landing.mockLive}
          </span>
          <span className="mono">PAULISTA · 18h–19h</span>
        </div>
        <div className="mt-3 text-lg font-medium">{top.question}</div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-up/30 bg-up/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-up">SIM</div>
            <div className="mt-1 text-3xl font-semibold mono text-up">
              <AnimatedNumber value={probability(top.pool, "YES") * 100} decimals={1} />%
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground mono">
              {formatBRL(top.pool.YES)}
            </div>
          </div>
          <div className="rounded-xl border border-down/30 bg-down/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-down">NÃO</div>
            <div className="mt-1 text-3xl font-semibold mono text-down">
              <AnimatedNumber value={(1 - probability(top.pool, "YES")) * 100} decimals={1} />%
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground mono">
              {formatBRL(top.pool.NO)}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border bg-background/40 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Probabilidade · 40 min</span>
            <span className="mono text-foreground">
              {copy.landing.prizeTotal} {formatBRL(prizePool(top.pool))}
            </span>
          </div>
          <Sparkline
            data={top.history.map((h) => h.p)}
            width={420}
            height={64}
            stroke="var(--color-primary)"
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            <Map className="inline size-3" /> {top.region}
          </span>
          <span>
            UrbanMind{" "}
            <span className="text-primary mono">
              {(top.aiPrediction.confidence * 100).toFixed(0)}%
            </span>{" "}
            · {top.aiPrediction.side}
          </span>
        </div>
      </div>
    </Link>
  );
}

function PhoneMock() {
  const markets = useCatalogMarkets();
  return (
    <div className="relative h-[520px] w-[260px] rounded-[44px] border border-border bg-surface/80 p-3 shadow-[var(--shadow-elevated)]">
      <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-background" />
      <div className="h-full w-full overflow-hidden rounded-[36px] bg-background">
        <div className="border-b px-4 pb-2 pt-7 text-[10px] uppercase tracking-wider text-muted-foreground">
          Mercados ao vivo · swipe
        </div>
        <div className="p-2 pt-3">
          <MobileMarketsCarousel markets={markets.slice(0, 5)} />
        </div>
      </div>
    </div>
  );
}
