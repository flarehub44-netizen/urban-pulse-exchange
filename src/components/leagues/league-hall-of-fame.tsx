import { Crown } from "lucide-react";
import { useLeagueSeasonHistory } from "@/hooks/use-leagues";
import { copy } from "@/copy/pt-BR";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type LeagueHallOfFameProps = {
  leagueId: string;
};

export function LeagueHallOfFame({ leagueId }: LeagueHallOfFameProps) {
  const { data: history = [], isLoading } = useLeagueSeasonHistory(leagueId);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-2">{copy.leagues.hallLoading}</p>;
  }

  if (history.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">{copy.leagues.hallEmpty}</p>;
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {copy.leagues.hallTitle}
      </h3>
      <ul className="space-y-2">
        {history.map((row) => (
          <li
            key={`${row.season_label}-${row.ends_at}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{row.season_label}</div>
              <div className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(row.ends_at), { addSuffix: true, locale: ptBR })}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-xs text-warn">
              <Crown className="size-3.5" />
              <span className="truncate max-w-[120px]">{row.winner_name}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
