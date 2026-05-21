import { copy } from "@/copy/pt-BR";
import type { Market } from "@/store/viax-store";
import { getMarketEdge } from "@/lib/market-edge";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export function EdgeBadge({ m, className }: { m: Market; className?: string }) {
  if (m.status !== "live" && m.status !== "closing") return null;
  const { edgePp, label, aiSide } = getMarketEdge(m);
  const positive = edgePp >= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium",
        positive
          ? aiSide === "YES"
            ? "border-up/30 bg-up/10 text-up"
            : "border-down/30 bg-down/10 text-down"
          : "border-warn/30 bg-warn/10 text-warn",
        className,
      )}
      title={copy.ia.badgeTooltip}
    >
      <Brain className="size-3 shrink-0 opacity-80" />
      {label}
    </span>
  );
}
