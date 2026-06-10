import { Swords, X } from "lucide-react";
import { useLeagueHeadToHead, useLeagueSuggestedRival } from "@/hooks/use-leagues";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

type LeagueRivalryPanelProps = {
  leagueId: string;
  opponentUserId: string | null;
  onClose: () => void;
};

function StatRow({
  label,
  mine,
  theirs,
  format = (v: number) => String(v),
}: {
  label: string;
  mine: number;
  theirs: number;
  format?: (v: number) => string;
}) {
  const diff = mine - theirs;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
      <span className="mono text-right font-medium">{format(mine)}</span>
      <span className="text-[10px] text-muted-foreground text-center">{label}</span>
      <span className="mono font-medium">{format(theirs)}</span>
      {diff !== 0 ? (
        <span
          className={cn(
            "col-span-3 text-center text-[10px] mono",
            diff > 0 ? "text-up" : "text-down",
          )}
        >
          {diff > 0 ? "+" : ""}
          {format(diff)} {copy.leagues.rivalryVsYou}
        </span>
      ) : null}
    </div>
  );
}

export function LeagueRivalryPanel({ leagueId, opponentUserId, onClose }: LeagueRivalryPanelProps) {
  const { data: h2h, isLoading } = useLeagueHeadToHead(
    leagueId,
    opponentUserId,
    !!opponentUserId,
  );
  const { data: suggested } = useLeagueSuggestedRival(leagueId, !opponentUserId);

  const data = opponentUserId ? h2h : suggested;
  const loading = opponentUserId ? isLoading : false;

  if (!opponentUserId && !suggested?.ok) return null;

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground py-2 border rounded-xl px-3">
        {copy.leagues.rivalryLoading}
      </p>
    );
  }

  if (!data?.ok || !data.me || !data.opponent) {
    return null;
  }

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Swords className="size-3.5 text-primary" />
          {copy.leagues.rivalryTitle}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:bg-surface"
          aria-label={copy.leagues.rivalryClose}
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-sm font-medium">
        <div className="text-right truncate">
          {data.me.name}
          <div className="text-[10px] text-primary font-normal">
            #{data.me.rank} · {data.me.score}
          </div>
        </div>
        <span className="text-muted-foreground text-xs self-center">vs</span>
        <div className="truncate">
          {data.opponent.name}
          <div className="text-[10px] text-muted-foreground font-normal">
            #{data.opponent.rank} · {data.opponent.score}
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-border/50 pt-2">
        <StatRow label="Score" mine={data.me.score} theirs={data.opponent.score} />
        <StatRow label="ROI" mine={data.me.roi} theirs={data.opponent.roi} format={pct} />
        <StatRow
          label={copy.leagues.rivalryVolume}
          mine={data.me.volume}
          theirs={data.opponent.volume}
          format={(v) => v.toFixed(0)}
        />
        <StatRow
          label={copy.leagues.rivalryAccuracy}
          mine={data.me.accuracy}
          theirs={data.opponent.accuracy}
          format={pct}
        />
      </div>

      {(data.rank_gap ?? 0) > 0 ? (
        <p className="text-[11px] text-muted-foreground text-center">
          {copy.leagues.rivalryCatchUp(data.rank_gap ?? 0, data.score_gap ?? 0)}
        </p>
      ) : (data.rank_gap ?? 0) < 0 ? (
        <p className="text-[11px] text-up text-center">
          {copy.leagues.rivalryAhead(Math.abs(data.rank_gap ?? 0))}
        </p>
      ) : null}
    </div>
  );
}
