import { Crown, Medal, Trophy } from "lucide-react";
import type { LeaguePreviewEntry } from "@/actions/leagues";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

type LeaguePublicPreviewProps = {
  preview: LeaguePreviewEntry[];
  className?: string;
};

function PodiumIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="size-3 text-warn" />;
  if (rank === 2) return <Medal className="size-3 text-muted-foreground" />;
  if (rank === 3) return <Trophy className="size-3 text-warn/70" />;
  return null;
}

export function LeaguePublicPreview({ preview, className }: LeaguePublicPreviewProps) {
  if (!preview.length) {
    return (
      <p className={cn("text-[10px] text-muted-foreground", className)}>
        {copy.leagues.publicPreviewEmpty}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {preview.map((entry) => (
        <div
          key={entry.rank}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-surface/50 px-2 py-0.5 text-[10px]"
        >
          <PodiumIcon rank={entry.rank} />
          <span className="font-medium truncate max-w-[72px]">{entry.label}</span>
          <span className="mono text-muted-foreground">{entry.score}</span>
        </div>
      ))}
    </div>
  );
}
