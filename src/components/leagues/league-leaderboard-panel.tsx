import { Crown, Medal, Trophy } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import type { LeagueMember } from "@/actions/leagues";
import { cn } from "@/lib/utils";
import type { Division } from "@/store/viax-store";

function divisionFromDb(d: string): Division {
  const map: Record<string, Division> = {
    bronze: "Bronze",
    silver: "Prata",
    gold: "Ouro",
    platinum: "Platina",
    diamond: "Diamante",
    elite: "Elite",
    Bronze: "Bronze",
    Prata: "Prata",
    Ouro: "Ouro",
    Platina: "Platina",
    Diamante: "Diamante",
    Elite: "Elite",
  };
  return map[d] ?? "Bronze";
}

type LeagueLeaderboardPanelProps = {
  members: LeagueMember[];
  isLoading?: boolean;
  showKick?: boolean;
  onKick?: (userId: string) => void;
};

export function LeagueLeaderboardPanel({
  members,
  isLoading,
  showKick,
  onKick,
}: LeagueLeaderboardPanelProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-center text-muted-foreground py-4">{copy.leagues.loadingRanking}</p>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-center text-muted-foreground py-4">{copy.leagues.loadingRanking}</p>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member, idx) => {
        const rank = member.rank ?? idx + 1;
        return (
          <div
            key={member.user_id}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2",
              member.is_me ? "bg-primary/10 border border-primary/20" : "border border-border/50",
            )}
          >
            <span
              className={cn(
                "mono text-sm font-bold w-6 text-center shrink-0",
                rank === 1
                  ? "text-warn"
                  : rank === 2
                    ? "text-muted-foreground"
                    : rank === 3
                      ? "text-warn/70"
                      : "text-muted-foreground/60",
              )}
            >
              {rank === 1 ? (
                <Crown className="size-4 mx-auto" />
              ) : rank === 2 ? (
                <Medal className="size-4 mx-auto" />
              ) : rank === 3 ? (
                <Trophy className="size-4 mx-auto" />
              ) : (
                `#${rank}`
              )}
            </span>
            <img
              src={member.avatar}
              alt={member.name}
              className="size-8 rounded-full bg-surface shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {member.name}
                {member.is_me && (
                  <span className="ml-1 text-xs text-primary">{copy.leagues.you}</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mono">
                {copy.leagues.statsLine(member.roi ?? 0, member.volume ?? 0, member.accuracy ?? 0)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-semibold mono text-primary">{member.score ?? 0}</div>
              <div className="text-[10px] text-muted-foreground">{divisionFromDb(member.division)}</div>
            </div>
            {showKick && !member.is_me && onKick ? (
              <button
                type="button"
                onClick={() => onKick(member.user_id)}
                className="text-[10px] text-down hover:underline shrink-0"
              >
                {copy.leagues.kickMember}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
