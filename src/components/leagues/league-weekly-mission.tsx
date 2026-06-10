import { CheckCircle2, Trophy, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useClaimLeagueWeeklyBonus, useLeagueWeeklyMissions } from "@/hooks/use-leagues";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

type LeagueWeeklyMissionProps = {
  compact?: boolean;
  leagueId?: string | null;
};

export function LeagueWeeklyMission({ compact, leagueId }: LeagueWeeklyMissionProps) {
  const { data: missions = [], isLoading } = useLeagueWeeklyMissions();
  const { mutateAsync: claim, isPending } = useClaimLeagueWeeklyBonus();

  const rows = leagueId ? missions.filter((m) => m.league_id === leagueId) : missions;
  const pending = rows.filter((m) => m.eligible && !m.claimed);
  const visible = compact ? pending.slice(0, 1) : rows;

  if (isLoading || visible.length === 0) return null;

  const handleClaim = async (id: string, name: string, xp: number) => {
    try {
      const res = await claim(id);
      if (res.ok) {
        toast.success(copy.leagues.weeklyClaimed(name), {
          description: copy.leagues.weeklyXp(xp),
        });
      } else if (res.reason === "already_claimed") {
        toast.message(copy.leagues.weeklyAlreadyClaimed);
      } else if (res.reason === "not_eligible") {
        toast.message(copy.leagues.weeklyNotEligible);
      }
    } catch {
      toast.error(copy.leagues.weeklyClaimError);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-primary/25 bg-primary/5 p-4", compact && "p-3")}>
      {!compact ? (
        <h3 className="heading-section text-sm flex items-center gap-2">
          <Trophy className="size-4 text-warn" />
          {copy.leagues.weeklyTitle}
        </h3>
      ) : null}
      <div className={cn("space-y-2", !compact && "mt-3")}>
        {visible.map((m) => (
          <div
            key={m.league_id}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2",
              m.claimed ? "border-border/40 opacity-70" : "border-primary/30 bg-card/60",
            )}
          >
            <span className="text-lg">⚡</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{m.league_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {m.claimed
                  ? copy.leagues.weeklyDone
                  : m.eligible
                    ? copy.leagues.weeklyReady
                    : copy.leagues.weeklyHint}
              </p>
            </div>
            {m.claimed ? (
              <CheckCircle2 className="size-4 text-primary shrink-0" />
            ) : m.eligible ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleClaim(m.league_id, m.league_name, m.xp_reward)}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                <Zap className="size-3" /> +{m.xp_reward}
              </button>
            ) : (
              <Link to="/markets" className="shrink-0 text-xs text-primary hover:underline">
                {copy.leagues.weeklyCta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
