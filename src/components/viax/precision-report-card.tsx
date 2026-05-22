import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { useBets } from "@/hooks/use-bets";

export function PrecisionReportCard() {
  const { data: bets } = useBets();

  const stats = useMemo(() => {
    const settled = (bets ?? []).filter((b) => b.payout != null);
    const wins = settled.filter((b) => (b.payout ?? 0) > 0);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = settled.filter((b) => new Date(b.createdAt).getTime() >= weekAgo);
    const recentWins = recent.filter((b) => (b.payout ?? 0) > 0);
    return {
      total: settled.length,
      wins: wins.length,
      accuracy: settled.length ? wins.length / settled.length : 0,
      weekAccuracy: recent.length ? recentWins.length / recent.length : 0,
      weekCount: recent.length,
    };
  }, [bets]);

  if (stats.total < 3) return null;

  return (
    <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-medium">
        <BarChart3 className="size-4 text-primary" />
        {copy.retention.precisionReportTitle}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-muted-foreground">{copy.retention.allTimeAccuracy}</dt>
          <dd className="mono mt-0.5 text-lg font-semibold">
            {(stats.accuracy * 100).toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{copy.retention.weekAccuracy}</dt>
          <dd className="mono mt-0.5 text-lg font-semibold text-up">
            {stats.weekCount > 0 ? `${(stats.weekAccuracy * 100).toFixed(1)}%` : "—"}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-muted-foreground">{copy.retention.precisionReportHint}</p>
    </div>
  );
}
