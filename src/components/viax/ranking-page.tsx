import { Link, useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/ranking";
import { useFollowedTraders } from "@/hooks/use-followed-traders";
import { useAuth } from "@/hooks/use-auth";
import { useAuthPublic } from "@/hooks/use-auth-public";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { RankBar } from "@/components/viax/rank-bar";
import { useResolvedTraders, useResolvedProfile } from "@/hooks/use-resolved-data";
import { DivisionBadge } from "@/components/viax/division-badge";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { Crown, Medal, Trophy, Users } from "lucide-react";
import { EmptyState } from "@/components/viax/empty-state";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/viax/page-header";
import { ImpactLeaderboardSection } from "@/components/viax/impact-leaderboard-section";
import { ImpactProgramBanner } from "@/components/viax/impact-program-banner";

const tabs = [
  { key: "global" as const, label: "Global" },
  { key: "cidade" as const, label: "Cidade" },
  { key: "bairro" as const, label: "Bairro" },
  { key: "amigos" as const, label: "Destaques" },
  { key: "impacto" as const, label: copy.ranking.impactTab },
];

export function RankingPage() {
  const navigate = useNavigate({ from: "/ranking" });
  const { tab = "global" } = Route.useSearch();
  const { isRegistered: isRegisteredApp, userId } = useAuth();
  const { isRegistered: isRegisteredPublic } = useAuthPublic();
  const isRegistered = isRegisteredApp || isRegisteredPublic;
  const { ids: followedIds } = useFollowedTraders();
  const { traders: traderList } = useResolvedTraders();
  const { profile } = useResolvedProfile();
  const myCity = profile?.city ?? "São Paulo";
  const myHood = profile?.neighborhood?.trim() || "Pinheiros";
  const myIndex = userId ? traderList.findIndex((t) => t.id === userId) : -1;
  const me = myIndex >= 0 ? traderList[myIndex] : null;

  const sortByRoi7d = (a: (typeof traderList)[0], b: (typeof traderList)[0]) =>
    b.weeklyGrowth - a.weeklyGrowth;

  const highlights =
    followedIds.length > 0
      ? traderList.filter((t) => followedIds.includes(t.id)).sort(sortByRoi7d)
      : [...traderList]
          .filter((t) => t.weeklyGrowth >= 0.1)
          .sort(sortByRoi7d)
          .slice(0, 6);

  const list =
    tab === "cidade"
      ? [...traderList].filter((t) => t.city === myCity)
      : tab === "bairro"
        ? [...traderList].filter((t) => t.neighborhood === myHood)
        : tab === "amigos"
          ? highlights.length > 0
            ? highlights
            : [...traderList].sort(sortByRoi7d).slice(0, 4)
          : traderList;

  const podium = list.slice(0, 3);
  const rest = list.slice(3);
  const isEmpty = traderList.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={<span className="text-highlight">Ranking</span>}
        description={
          tab === "impacto"
            ? copy.ranking.impactTabDesc
            : tab === "amigos"
              ? copy.ranking.followingSort
              : copy.ranking.defaultSort
        }
      />

      {tab === "impacto" && <ImpactProgramBanner compact />}

      {!isRegistered && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
          <p className="text-sm text-muted-foreground">{copy.depositFunnel.rankingCta}</p>
          <AuthModalTrigger
            mode="signup"
            depositAfter
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {copy.auth.registerCta}
          </AuthModalTrigger>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() =>
              navigate({
                search: {
                  tab:
                    t.key === "global"
                      ? undefined
                      : (t.key as "cidade" | "bairro" | "amigos" | "impacto"),
                },
                replace: true,
              })
            }
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              tab === t.key
                ? "border-primary/60 bg-primary/15 text-primary shadow-[var(--shadow-glow-primary)]"
                : "border-border bg-card text-muted-foreground hover:bg-surface-2",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "impacto" ? (
        <ImpactLeaderboardSection />
      ) : (
        <>
      {me && myIndex >= 0 && <RankBar trader={me} rank={myIndex + 1} />}

      {isEmpty && (
        <EmptyState
          icon={Users}
          title={copy.empty.ranking.title}
          description={copy.empty.ranking.description}
          action={{ label: copy.empty.ranking.cta, to: "/markets", search: { status: "live" } }}
        />
      )}

      {!isEmpty && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {podium.map((t, i) => {
              const Icon = i === 0 ? Crown : i === 1 ? Trophy : Medal;
              const tone =
                i === 0 ? "text-yellow-300" : i === 1 ? "text-slate-200" : "text-amber-400";
              return (
                <Link
                  key={t.id}
                  to="/profile/$userId"
                  params={{ userId: t.id }}
                  className={cn(
                    "surface-card-interactive relative block overflow-hidden transition hover:bg-surface/40",
                    i === 0 &&
                      "border-yellow-400/40 shadow-[0_0_50px_-12px_oklch(0.84_0.17_85/0.45)]",
                    userId === t.id && "ring-2 ring-primary/50",
                  )}
                >
                  <div className="absolute right-4 top-4">
                    <Icon className={cn("size-6", tone)} />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    #{i + 1}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={t.avatar}
                      className="size-14 rounded-full border bg-surface"
                      alt={t.name}
                    />
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">@{t.handle}</div>
                      <DivisionBadge division={t.division} className="mt-1" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <Box
                      label={copy.ranking.precision}
                      value={`${(t.accuracy * 100).toFixed(1)}%`}
                    />
                    <Box
                      label={copy.ranking.return}
                      value={`+${(t.roi * 100).toFixed(0)}%`}
                      tone="up"
                    />
                    <Box label="Streak" value={`🔥 ${t.streak}`} />
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="surface-card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Trader</th>
                  <th className="px-4 py-3 text-left">Divisão</th>
                  <th className="px-4 py-3 text-right">{copy.ranking.precision}</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-right">
                    {copy.ranking.return}
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-right">Streak</th>
                  <th className="hidden md:table-cell px-4 py-3 text-right">Volume</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-right">7d</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((t, i) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer border-t border-border/60 hover:bg-surface/40"
                    onClick={() => navigate({ to: "/profile/$userId", params: { userId: t.id } })}
                  >
                    <td className="px-4 py-3 mono text-muted-foreground">{i + 4}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={t.avatar}
                          className="size-8 rounded-full bg-surface"
                          alt={t.name}
                        />
                        <div>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            @{t.handle} · {t.neighborhood}
                          </div>
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
                      🔥 {t.streak}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right mono">
                      {formatBRL(t.volume)}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-right mono">
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
        </>
      )}
        </>
      )}
    </div>
  );
}

function Box({ label, value, tone }: { label: string; value: string; tone?: "up" }) {
  return (
    <div className="rounded-lg border bg-surface/60 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm mono", tone === "up" && "text-up")}>{value}</div>
    </div>
  );
}
