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
import {
  ArrowLeft,
  Lock,
  UserPlus,
  UserMinus,
  Zap,
  Link2,
  BarChart2,
  Activity,
  History,
} from "lucide-react";
import { EmptyState } from "@/components/viax/empty-state";
import { usePublicTraderBets } from "@/hooks/use-public-trader-bets";
import { usePublicExpertProfile } from "@/hooks/use-partner";
import { buildPartnerUrl } from "@/lib/share-url";
import { copyShareUrl } from "@/lib/share-url";
import { cn } from "@/lib/utils";

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

  const hasPnlHistory = false; // replaced when real history API is available
  const hasActivityHistory = false; // replaced when real activity API is available

  const isMe = myId === targetId;
  const { isFollowing, toggle, isPending } = useFollowedTraders();
  const following = !isMe && isFollowing(targetId);
  const { data: publicBets } = usePublicTraderBets(targetId);
  const { data: expert } = usePublicExpertProfile(targetId);

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
          <img src={avatar} className="size-20 rounded-2xl border bg-surface" alt={name} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="heading-page text-2xl">
                <span className="text-highlight">{name}</span>
              </h1>
              <DivisionBadge division={division} />
              {expert?.partner_verified && (
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {copy.partner.verified}
                </span>
              )}
            </div>
            {expert?.is_partner && expert.partner_slug && (
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={buildPartnerUrl(expert.partner_slug)}
                  className="text-xs text-primary hover:underline"
                >
                  {copy.partner.expertPage} →
                </a>
                {expert.top_regions?.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {copy.partner.favoriteMarkets}:{" "}
                    {expert.top_regions.map((r) => r.region).join(", ")}
                  </span>
                )}
              </div>
            )}
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
          <h2 className="heading-section">
            Ganhos · <span className="text-highlight">60 dias</span>
          </h2>
          {hasPnlHistory ? null : (
            <div className="mt-3 flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <BarChart2 className="size-8 opacity-25" />
              <p className="text-sm">Histórico disponível após apostas resolvidas</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
          <h2 className="heading-section">
            Atividade · <span className="text-highlight">12 semanas</span>
          </h2>
          {hasActivityHistory ? null : (
            <div className="mt-3 flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <Activity className="size-8 opacity-25" />
              <p className="text-sm">A atividade do trader aparecerá aqui</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="heading-subsection mb-3">
          Últimas <span className="text-highlight">apostas</span> públicas
        </h2>
        {(publicBets ?? []).length === 0 ? (
          <EmptyState
            icon={History}
            title={copy.empty.traders.title}
            description={copy.empty.traders.description}
            action={{ label: copy.empty.traders.cta, to: "/ranking" }}
            compact
          />
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
        <h2 className="heading-subsection mb-3">
          <span className="text-highlight">Badges</span>
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
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
