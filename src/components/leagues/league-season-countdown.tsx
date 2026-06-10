import { Countdown } from "@/components/viax/countdown";
import { copy } from "@/copy/pt-BR";
import { seasonEndsMs, leagueUrgency } from "@/lib/league-engagement";
import { cn } from "@/lib/utils";

type LeagueSeasonCountdownProps = {
  endsAt?: string;
  className?: string;
};

export function LeagueSeasonCountdown({ endsAt, className }: LeagueSeasonCountdownProps) {
  const endMs = seasonEndsMs(endsAt);
  if (endMs == null || endMs <= Date.now()) return null;

  const urgency = leagueUrgency(endsAt);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        urgency === "urgent" && "text-warn font-medium",
        urgency === "soon" && "text-primary/90",
        urgency === "none" && "text-muted-foreground",
        className,
      )}
    >
      <span>{copy.leagues.seasonEndsIn}</span>
      <Countdown
        to={endMs}
        urgentThreshold={24 * 3_600_000}
        className={urgency === "urgent" ? "text-warn" : undefined}
      />
    </div>
  );
}
