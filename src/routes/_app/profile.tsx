import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SettingsPanel } from "@/components/viax/settings-panel";
import { PositionsPanel } from "@/components/viax/positions-panel";
import { WalletPanel } from "@/components/viax/wallet-panel";
import { useViaX } from "@/store/viax-store";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { useResolvedMarkets, useResolvedTransactions } from "@/hooks/use-resolved-data";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePnlSeries } from "@/hooks/use-pnl-series";
import { useActivityCalendar } from "@/hooks/use-activity-calendar";
import { supabase } from "@/integrations/supabase/client";
import { DivisionBadge } from "@/components/viax/division-badge";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { MarketCard } from "@/components/viax/market-card";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { Lock, Mail, ShieldCheck, AlertTriangle, Star } from "lucide-react";
import { EmptyState } from "@/components/viax/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

export type ProfileSearch = {
  tab?: "visao" | "posicoes" | "carteira" | "favoritos" | "badges" | "atividade" | "config";
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
  { key: "config" as const, label: "Configurações" },
];

const badges = [
  { name: "Mestre da Paulista", unlocked: true, desc: "10 wins na Av. Paulista" },
  { name: "Rei do Rush", unlocked: true, desc: "5 wins entre 18h–19h" },
  { name: "Alpha Predictor", unlocked: true, desc: "Acertou contra IA 3x seguidas" },
  { name: "Traffic Sniper", unlocked: true, desc: copy.profile.badgeRoi },
  { name: "Urban Oracle", unlocked: false, desc: "Top 100 global" },
  { name: "Maratonista", unlocked: false, desc: "30 mercados em 1 dia" },
  { name: "Marginal Master", unlocked: false, desc: "10 wins na Marginal" },
  { name: "Volume Beast", unlocked: false, desc: "R$ 50k movimentados" },
];

function Profile() {
  const navigate = useNavigate({ from: "/_app/profile" });
  const { tab = "visao" } = Route.useSearch();
  const zustandMe = useViaX((s) => s.me);
  const { userId } = useAnonAuth();
  const { data: dbProfile } = useProfile(userId);
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
  const { markets } = useResolvedMarkets();
  const { ids: watchlist } = useWatchlist();
  const favMarkets = markets.filter((m) => watchlist.includes(m.id));
  const [isAnon, setIsAnon] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [linkState, setLinkState] = useState<"idle" | "loading" | "sent" | "error">("idle");

  useEffect(() => {
    if (!userId) return;
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? null;
      setUserEmail(email);
      setIsAnon(!email);
    });
  }, [userId]);

  const linkEmail = async () => {
    if (!emailInput) return;
    setLinkState("loading");
    const { error } = await supabase.auth.updateUser({ email: emailInput });
    if (error) {
      setLinkState("error");
      return;
    }
    setLinkState("sent");
  };

  const chartData =
    pnl.length > 0
      ? pnl
      : Array.from({ length: 30 }, (_, i) => ({ d: i, v: me.pnl * (i / 29), label: "" }));

  const xpPct = (me.xp / me.xpToNext) * 100;

  return (
    <div className="space-y-6">
      {isAnon && (
        <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <div className="flex-1 text-sm">
            <span className="font-medium text-warn">Conta anônima</span>
            <span className="ml-1 text-muted-foreground">
              — seu histórico será perdido se você limpar os cookies.
            </span>
          </div>
          <button
            onClick={() => setEmailDialog(true)}
            className="shrink-0 rounded-xl border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs font-medium text-warn hover:bg-warn/20"
          >
            Proteger conta
          </button>
        </div>
      )}

      {!isAnon && userEmail && (
        <div className="flex items-center gap-2 rounded-xl border border-up/30 bg-up/5 px-4 py-2.5 text-sm">
          <ShieldCheck className="size-4 text-up" />
          <span className="text-muted-foreground">Conta vinculada a</span>
          <span className="font-medium">{userEmail}</span>
        </div>
      )}

      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card/60 to-card/40 p-6 backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <img src={me.avatar} className="size-20 rounded-2xl border bg-surface" alt={me.name} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{me.name}</h1>
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

      {tab === "config" && <SettingsPanel />}
      {tab === "posicoes" && <PositionsPanel embedded />}
      {tab === "carteira" && <WalletPanel embedded />}

      {(tab === "visao" || tab === "atividade") && (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
            <h2 className="text-sm font-medium">{copy.profile.gains60d}</h2>
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

          <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
            <h2 className="text-sm font-medium">Atividade · 12 semanas</h2>
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

      {(tab === "visao" || tab === "favoritos") && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            <Star className="size-3.5 fill-warn text-warn" /> Mercados favoritos
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
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Badges
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {badges.map((b) => (
              <div
                key={b.name}
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
                <div className="text-[11px] text-muted-foreground">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={emailDialog}
        onOpenChange={(o) => {
          if (!o) {
            setEmailDialog(false);
            setLinkState("idle");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-4 text-primary" /> Proteger minha conta
            </DialogTitle>
          </DialogHeader>
          {linkState === "sent" ? (
            <div className="space-y-3 py-2 text-center">
              <ShieldCheck className="mx-auto size-10 text-up" />
              <p className="text-sm font-medium">Confirme seu e-mail!</p>
              <p className="text-xs text-muted-foreground">
                Enviamos um link de confirmação para <strong>{emailInput}</strong>. Clique nele para
                vincular o e-mail à sua conta.
              </p>
              <button
                onClick={() => setEmailDialog(false)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Entendido
              </button>
            </div>
          ) : (
            <div className="space-y-4 py-1">
              <p className="text-sm text-muted-foreground">
                Vincule um e-mail para não perder seu saldo e histórico ao trocar de dispositivo.
              </p>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  E-mail
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full rounded-xl border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary/60"
                />
              </div>
              {linkState === "error" && (
                <p className="text-xs text-down">Erro ao vincular. Tente novamente.</p>
              )}
              <button
                onClick={linkEmail}
                disabled={!emailInput || linkState === "loading"}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {linkState === "loading" ? "Enviando…" : "Vincular e-mail"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
