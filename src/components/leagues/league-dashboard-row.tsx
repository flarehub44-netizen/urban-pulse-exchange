import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useMyLeagueRank } from "@/hooks/use-leagues";
import { LeagueSeasonCountdown } from "@/components/leagues/league-season-countdown";
import { copy } from "@/copy/pt-BR";
import type { League } from "@/actions/leagues";
import { leagueUrgency } from "@/lib/league-engagement";
import { cn } from "@/lib/utils";

export function LeagueDashboardRow({ league }: { league: League }) {
  const { data: rank } = useMyLeagueRank(league.id);
  const urgency = leagueUrgency(league.season_ends_at);

  return (
    <Link
      to="/leagues"
      search={{ selected: league.id }}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border bg-surface/50 px-3 py-2 text-sm hover:border-primary/30 transition",
        urgency === "urgent" && "border-warn/40 bg-warn/5",
        urgency === "soon" && "border-primary/30",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate font-medium">
          <Trophy className="size-3.5 shrink-0 text-warn" />
          {league.name}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {rank?.ok && rank.rank != null && rank.member_count != null && rank.score != null
            ? copy.leagues.scoreLine(rank.rank, rank.member_count, rank.score)
            : copy.leagues.memberCount(league.member_count)}
        </div>
        <LeagueSeasonCountdown endsAt={league.season_ends_at} className="mt-0.5" />
      </div>
      <span className="shrink-0 text-xs text-primary">→</span>
    </Link>
  );
}
