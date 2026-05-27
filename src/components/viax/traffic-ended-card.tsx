import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatBRL, poolTotal, prizePool } from "@/lib/parimutuel";
import {
  formatTrafficOutcomeSummary,
  trafficOutcomeStatusBadge,
} from "@/lib/traffic-outcome-summary";
import type { TrafficEndedMarket } from "@/hooks/use-traffic-ended-markets";

export function TrafficEndedCard({ market }: { market: TrafficEndedMarket }) {
  const summary = formatTrafficOutcomeSummary({
    status: market.status,
    target: market.target,
    comparisonOp: market.comparison_op,
    resolutionMetric: market.resolution_metric,
    category: market.category,
    rawValue: market.rawValue,
    derivedSide: market.derivedSide,
    resolved: market.resolved,
  });
  const badge = trafficOutcomeStatusBadge(market.status);
  const isSettled = market.status === "settled";

  return (
    <Link
      to="/markets/$marketId"
      params={{ marketId: market.id }}
      className={cn(
        "block rounded-xl border bg-card/60 p-4 transition hover:border-primary/40 hover:bg-card",
        !isSettled && "opacity-90",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            market.status === "void"
              ? "border-warn/40 bg-warn/10 text-warn"
              : market.status === "dispute"
                ? "border-down/40 bg-down/10 text-down"
                : "border-border bg-surface text-muted-foreground",
          )}
        >
          {badge}
        </span>
        {isSettled && market.resolved && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold",
              market.resolved === "YES" ? "bg-up/15 text-up" : "bg-down/15 text-down",
            )}
          >
            {market.resolved === "YES" ? "SIM" : "NÃO"}
          </span>
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium leading-snug">{market.question}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{market.region}</p>
      <p className="mt-2 text-xs text-foreground/90">{summary}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span>
          {format(market.startsAt, "HH:mm", { locale: ptBR })}
          {" – "}
          {format(market.endsAt, "HH:mm", { locale: ptBR })}
        </span>
        <span>{market.participants} participantes</span>
        <span className="mono">{formatBRL(prizePool({ YES: market.poolYes, NO: market.poolNo }))}</span>
        <span className="mono">pool {formatBRL(poolTotal({ YES: market.poolYes, NO: market.poolNo }))}</span>
      </div>
    </Link>
  );
}
