import { useMarketAudit } from "@/hooks/use-market-audit";
import type { Market } from "@/store/viax-store";
import { formatTrafficOutcomeSummary } from "@/lib/traffic-outcome-summary";
import { copy } from "@/copy/pt-BR";
import { isSettledDisplay } from "@/lib/market-status";

export function TrafficOutcomeSection({ market }: { market: Market }) {
  const { data } = useMarketAudit(market.id);
  const latest = data?.resolutions?.[0];
  const show =
    market.isTrafficSlot &&
    (market.status === "settled" || market.status === "void" || market.status === "dispute");

  if (!show) return null;

  const summary = formatTrafficOutcomeSummary({
    status: market.status,
    target: market.target,
    comparisonOp: market.comparisonOp ?? null,
    resolutionMetric: market.resolutionMetric ?? null,
    category: market.category,
    rawValue: latest?.raw_value != null ? Number(latest.raw_value) : null,
    derivedSide: latest?.derived_side ?? null,
    resolved: market.resolved ?? null,
  });

  return (
    <section className="rounded-xl border border-border bg-card/50 px-4 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {copy.traffic.outcomeSectionTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed">{summary}</p>
      {!isSettledDisplay(market.status) && market.status !== "void" && (
        <p className="mt-2 text-xs text-muted-foreground">{copy.traffic.outcomePendingHint}</p>
      )}
    </section>
  );
}
