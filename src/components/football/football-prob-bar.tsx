import type { FootballPool } from "@/lib/football-parimutuel";
import { poolTotal3 } from "@/lib/football-parimutuel";
import { cn } from "@/lib/utils";

export function FootballProbBar({ pool, className }: { pool: FootballPool; className?: string }) {
  const total = poolTotal3(pool);
  const pHome = total === 0 ? 1 / 3 : pool.HOME / total;
  const pDraw = total === 0 ? 1 / 3 : pool.DRAW / total;
  const pAway = total === 0 ? 1 / 3 : pool.AWAY / total;

  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-up to-up/70 transition-[width] duration-500 ease-out"
        style={{ width: `${pHome * 100}%` }}
      />
      <div
        className="absolute inset-y-0 bg-gradient-to-r from-warn/80 to-warn/50 transition-[width] duration-500 ease-out"
        style={{ left: `${pHome * 100}%`, width: `${pDraw * 100}%` }}
      />
      <div
        className="absolute inset-y-0 right-0 bg-gradient-to-l from-down to-down/70 transition-[width] duration-500 ease-out"
        style={{ width: `${pAway * 100}%` }}
      />
    </div>
  );
}
