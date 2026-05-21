import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useTraders } from "@/hooks/use-traders";
import { useViaX } from "@/store/viax-store";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { DivisionBadge } from "@/components/viax/division-badge";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { useFollowedTraders } from "@/hooks/use-followed-traders";
import { toast } from "sonner";
import { ArrowLeft, Lock, UserPlus, UserMinus, Zap, Link2 } from "lucide-react";
import { usePublicTraderBets } from "@/hooks/use-public-trader-bets";
import { copyShareUrl } from "@/lib/share-url";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/profile/$userId")({
  head: () => ({
    meta: [
      { title: "Perfil do Trader · ViaX" },
      { name: "description", content: "Perfil público do trader na ViaX." },
    ],
  }),
  component: PublicProfile,
});

const badges = [
  { name: "Mestre da Paulista", desc: "10 wins na Av. Paulista" },
  { name: "Rei do Rush", desc: "5 wins entre 18h–19h" },
  { name: "Alpha Predictor", desc: "Acertou contra IA 3x seguidas" },
  { name: "Traffic Sniper", desc: copy.profile.badgeRoi },
  { name: "Urban Oracle", desc: "Top 100 global" },
  { name: "Maratonista", desc: "30 mercados em 1 dia" },
  { name: "Marginal Master", desc: "10 wins na Marginal" },
  { name: "Volume Beast", desc: "R$ 50k movimentados" },
];

function PublicProfile() {
  const { userId: targetId } = Route.useParams();
  const { userId: myId } = useAnonAuth();

  const { data: profile } = useProfile(targetId);
  const { data: dbTraders } = useTraders();
  const zustandTraders = useViaX((s) => s.traders);
  const traders = dbTraders ?? zustandTraders;

  // Fallback: find trader in leaderboard list
  const traderFallback = traders.find((t) => t.id === targetId);

  const name = profile?.name ?? traderFallback?.name ?? "Trader";
  const handle = profile?.handle ?? traderFallback?.handle ?? "viax_user";
  const avatar =
    profile?.avatar ??
    traderFallback?.avatar ??
    `https://api.dicebear.com/9.x/glass/svg?seed=${targetId}`;
  const division = profile?.division ?? traderFallback?.division ?? "Bronze";
  const city = profile?.city ?? traderFallback?.city ?? "São Paulo";
  const neighborhood = profile?.neighborhood ?? traderFallback?.neighborhood ?? "";
  const accuracy = profile?.accuracy ?? traderFallback?.accuracy ?? 0.5;
  const roi = profile?.roi ?? traderFallback?.roi ?? 0;
  const pnl = profile?.pnl ?? 0;
  const streak = profile?.streak ?? traderFallback?.streak ?? 0;
  const xp = profile?.xp ?? 0;
  const xpToNext = profile?.xpToNext ?? 2000;

  const xpPct = xpToNext > 0 ? (xp / xpToNext) * 100 : 0;

  const pnlData = Array.from({ length: 60 }, (_, i) => ({
    d: i,
    v: Math.max(0, i * 18 + Math.sin(i / 5) * 200 + (Math.random() - 0.45) * 60),
  }));

  const calendar = Array.from({ length: 84 }, () => Math.random());

  const isMe = myId === targetId;
  const { isFollowing, toggle, isPending } = useFollowedTraders();
  const following = !isMe && isFollowing(targetId);
  const { data: publicBets } = usePublicTraderBets(targetId);

  useEffect(() => {
    document.title = `@${handle} · ViaX`;
  }, [handle]);

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link to="/ranking" className="hover:text-foreground">
          Ranking
        </Link>
        <span className="text-muted-foreground/40">›</span>
        <span className="text-foreground/90">@{handle}</span>
      </nav>
      <div className="flex items-center gap-3">
        <Link
          to="/ranking"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground md:hidden"
        >
          <ArrowLeft className="size-3.5" /> Voltar
        </Link>
        {isMe ? (
          <Link to="/profile" className="ml-auto text-xs text-primary hover:underline">
            Editar meu perfil →
          </Link>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyShareUrl(`/profile/${targetId}`)}
              className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-2"
            >
              <Link2 className="size-3.5" /> Compartilhar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                toggle(targetId);
                toast.success(
                  following ? "Deixou de seguir" : "Seguindo — aparece em Destaques no ranking",
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              {following ? <UserMinus className="size-3.5" /> : <UserPlus className="size-3.5" />}
              {following ? "Seguindo" : "Seguir"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card/60 to-card/40 p-6 backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <img src={avatar} className="size-20 rounded-2xl border bg-surface" alt="" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{name}</h1>
              <DivisionBadge division={division} />
            </div>
            <div className="text-sm text-muted-foreground">
              @{handle} · {city}
              {neighborhood ? ` · ${neighborhood}` : ""}
            </div>
            {xp > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-glow shadow-[var(--shadow-glow-primary)]"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
                <span className="mono text-xs">
                  {xp} / {xpToNext} XP
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI
            label={copy.profile.precision}
            value={
              <>
                <AnimatedNumber value={accuracy * 100} decimals={1} />%
              </>
            }
          />
          <KPI
            label={copy.profile.totalReturn}
            value={
              <span className="text-up">
                <AnimatedNumber value={roi * 100} decimals={1} />%
              </span>
            }
          />
          <KPI
            label="Lucro acumulado"
            value={<AnimatedNumber value={Math.abs(pnl)} format={formatBRL} />}
          />
          <KPI label="Streak" value={<>🔥 {streak}</>} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
          <h2 className="text-sm font-medium">{copy.profile.gains60d}</h2>
          <div className="mt-3" style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={pnlData}>
                <defs>
                  <linearGradient id="ppub" x1="0" x2="0" y1="0" y2="1">
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
                  fill="url(#ppub)"
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
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Menos</span>
            <div className="flex gap-1">
              {[0.1, 0.3, 0.5, 0.8].map((o) => (
                <span key={o} className="size-2 rounded-[2px] bg-primary" style={{ opacity: o }} />
              ))}
            </div>
            <span>Mais</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Últimas apostas públicas
        </h2>
        {(publicBets ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum resultado resolvido público ainda.</p>
        ) : (
          <div className="space-y-2">
            {(publicBets ?? []).map((b) => {
              const isWin = b.payout > 0;
              return (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border bg-card/60 p-4 backdrop-blur"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                      isWin
                        ? "border-up/30 bg-up/10 text-up"
                        : "border-down/30 bg-down/10 text-down",
                    )}
                  >
                    {isWin ? "W" : "L"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-medium">{b.marketQuestion}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {b.marketRegion} ·{" "}
                      <span
                        className={cn("font-medium", b.side === "YES" ? "text-up" : "text-down")}
                      >
                        {b.side === "YES" ? "↑ SIM" : "↓ NÃO"}
                      </span>
                      {" · "}
                      <span className="mono">{formatBRL(b.stake)}</span>
                      {isWin && (
                        <>
                          {" → "}
                          <span className="mono text-up">{formatBRL(b.payout)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {!isMe && (
                    <Link
                      to="/markets/$marketId"
                      params={{ marketId: b.marketId }}
                      search={{ side: b.side }}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                    >
                      <Zap className="size-3" /> Copiar lado
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Badges
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((b, i) => {
            const unlocked = i < 4;
            return (
              <div
                key={b.name}
                className={cn(
                  "rounded-2xl border p-4",
                  unlocked
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-card/40 opacity-60",
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "size-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow",
                      !unlocked && "grayscale",
                    )}
                  />
                  {!unlocked && <Lock className="size-3.5 text-muted-foreground" />}
                </div>
                <div className="mt-3 text-sm font-medium">{b.name}</div>
                <div className="text-[11px] text-muted-foreground">{b.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
