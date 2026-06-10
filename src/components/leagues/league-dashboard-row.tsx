import { Link } from "@tanstack/react-router";
import { useMyLeagueRank } from "@/hooks/use-leagues";
import { copy } from "@/copy/pt-BR";
import type { League } from "@/actions/leagues";

export function LeagueDashboardRow({ league }: { league: League }) {
  const { data: rank } = useMyLeagueRank(league.id);

  return (
    <Link
      to="/leagues"
      search={{ selected: league.id }}
      className="flex items-center justify-between gap-3 rounded-xl border bg-surface/50 px-3 py-2 text-sm hover:border-primary/30 transition"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{league.name}</div>
        <div className="text-[11px] text-muted-foreground">
          {rank?.ok && rank.rank != null && rank.member_count != null && rank.score != null
            ? copy.leagues.scoreLine(rank.rank, rank.member_count, rank.score)
            : copy.leagues.memberCount(league.member_count)}
        </div>
      </div>
      <span className="shrink-0 text-xs text-primary">→</span>
    </Link>
  );
}
