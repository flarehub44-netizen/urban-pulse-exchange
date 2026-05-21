import { Link } from "@tanstack/react-router";
import type { Trader } from "@/store/viax-store";
import { DivisionBadge } from "./division-badge";
import { cn } from "@/lib/utils";

export function RankBar({
  trader,
  rank,
  className,
}: {
  trader: Trader;
  rank: number;
  className?: string;
}) {
  return (
    <Link
      to="/profile/$userId"
      params={{ userId: trader.id }}
      className={cn(
        "flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm transition hover:bg-primary/10",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="mono text-lg font-semibold text-primary">#{rank}</span>
        <img src={trader.avatar} className="size-10 rounded-full border bg-surface" alt="" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-primary">Sua posição</div>
          <div className="font-medium">{trader.name}</div>
        </div>
      </div>
      <DivisionBadge division={trader.division} />
    </Link>
  );
}
