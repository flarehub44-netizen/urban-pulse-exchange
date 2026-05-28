import { Link } from "@tanstack/react-router";
import { Crown, Medal, Trophy } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { useMonthlyImpactLeaderboard } from "@/hooks/use-impact-leaderboard";
import { DivisionBadge } from "@/components/viax/division-badge";
import type { Division } from "@/store/viax-store";
import { InlineError } from "@/components/viax/inline-error";
import { cn } from "@/lib/utils";
import type { ImpactLeaderboardEntry, ImpactWinnerEntry } from "@/actions/impact";

const podiumIcons = [Crown, Medal, Trophy];
const podiumColors = ["text-yellow-300", "text-slate-300", "text-amber-600"];

function PodiumCard({
  entry,
  prizeLabel,
  fulfilled,
}: {
  entry: ImpactLeaderboardEntry | ImpactWinnerEntry;
  prizeLabel?: string;
  fulfilled?: boolean;
}) {
  const rank = "rank" in entry ? entry.rank : 0;
  const Icon = podiumIcons[rank - 1] ?? Trophy;
  const color = podiumColors[rank - 1] ?? "text-muted-foreground";
  const name = "name" in entry ? entry.name : "";
  const handle = "handle" in entry ? entry.handle : "";
  const xp = "impact_xp" in entry ? entry.impact_xp : entry.xp_total;
  const division = "division" in entry ? entry.division : undefined;

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border bg-card/60 p-4 text-center backdrop-blur",
        rank === 1 && "border-yellow-400/40 shadow-[var(--shadow-glow-up)]",
      )}
    >
      <Icon className={cn("size-8", color)} />
      <span className="mt-1 text-xs font-bold uppercase text-muted-foreground">#{rank}</span>
      <img
        src={
          entry.avatar ??
          `https://api.dicebear.com/9.x/glass/svg?seed=${entry.user_id}`
        }
        alt=""
        className="mt-2 size-14 rounded-full border bg-surface"
      />
      <div className="mt-2 font-semibold line-clamp-1">{name}</div>
      <div className="text-xs text-muted-foreground">@{handle}</div>
      {division && (
        <DivisionBadge division={division as Division} className="mt-2" />
      )}
      <div className="mt-2 mono text-sm font-semibold text-primary">{xp} XP</div>
      {prizeLabel && (
        <p className="mt-2 text-[10px] text-muted-foreground">{prizeLabel}</p>
      )}
      {fulfilled !== undefined && (
        <span
          className={cn(
            "mt-1 rounded-full px-2 py-0.5 text-[10px]",
            fulfilled
              ? "bg-up/15 text-up"
              : "bg-warn/15 text-warn",
          )}
        >
          {fulfilled ? copy.impact.fulfilledBadge : copy.impact.pendingPrizeBadge}
        </span>
      )}
    </div>
  );
}

export function ImpactLeaderboardSection() {
  const { data, isLoading, isError, refetch } = useMonthlyImpactLeaderboard(undefined, 50);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl border bg-card/40" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <InlineError onRetry={() => refetch()} />;
  }

  const leaderboard = data?.leaderboard ?? [];
  const winners = data?.winners ?? [];
  const podiumSource =
    winners.length >= 3
      ? winners
      : leaderboard.slice(0, 3);
  const periodLabel = data?.period_label ?? "";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm">
        <p className="font-medium">{copy.impact.top3Title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.impact.top3Subtitle}</p>
        <p className="mt-2 text-[10px] text-muted-foreground">{copy.impact.exclusivePrizeDisclaimer}</p>
      </div>

      {data && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card/40 px-4 py-3 text-sm">
          <span>{copy.impact.leaderboardMonth(periodLabel)}</span>
          <span className="text-muted-foreground">
            {copy.impact.daysLeftInMonth(Math.max(0, data.days_left ?? 0))}
          </span>
          {data.my_rank != null ? (
            <span className="text-primary">{copy.impact.myRank(data.my_rank)}</span>
          ) : (
            <span className="text-muted-foreground">{copy.impact.myRankPending}</span>
          )}
          <span className="mono text-xs">{copy.impact.myXpMonth(data.my_xp ?? 0)}</span>
        </div>
      )}

      {podiumSource.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {podiumSource.map((entry) => (
            <PodiumCard
              key={`${entry.user_id}-${entry.rank}`}
              entry={entry}
              prizeLabel={
                entry.rank === 1
                  ? copy.impact.prizeTier1
                  : entry.rank === 2
                    ? copy.impact.prizeTier2
                    : copy.impact.prizeTier3
              }
              fulfilled={
                "fulfilled_at" in entry ? !!entry.fulfilled_at : undefined
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-8">
          {copy.impact.myRankPending}
        </p>
      )}

      {leaderboard.length > 3 && (
        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Trader</th>
                <th className="px-3 py-2 text-right">XP impacto</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.user_id} className="border-b last:border-0">
                  <td className="px-3 py-2 mono">{row.rank}</td>
                  <td className="px-3 py-2">
                    <Link
                      to="/profile/$userId"
                      params={{ userId: row.user_id }}
                      className="hover:text-primary"
                    >
                      @{row.handle}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right mono">{row.impact_xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
