import { copy } from "@/copy/pt-BR";
import type { MarketSegment } from "@/routes/markets";
import { cn } from "@/lib/utils";

const SEGMENTS: { key: MarketSegment; label: string }[] = [
  { key: "transito", label: copy.markets.transitoTab },
  { key: "futebol", label: copy.markets.futebolTab },
  { key: "outros", label: copy.markets.outrosTab },
];

type MarketsSegmentTabsProps = {
  segment: MarketSegment;
  onChange: (segment: MarketSegment) => void;
};

export function MarketsSegmentTabs({ segment, onChange }: MarketsSegmentTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
      {SEGMENTS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition",
            segment === key
              ? "bg-primary/15 font-medium text-primary"
              : "text-muted-foreground hover:bg-surface hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
