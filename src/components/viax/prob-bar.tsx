import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { copy } from "@/copy/pt-BR";

export function ProbBar({
  yes,
  no,
  showHotZone,
}: {
  yes: number;
  no: number;
  /** Efeito visual cassino: marca faixa perto de 50% */
  showHotZone?: boolean;
}) {
  const total = yes + no;
  const py = total === 0 ? 0.5 : yes / total;
  const nearFifty = Math.abs(py - 0.5) <= 0.08;
  return (
    <div className="space-y-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2 animate-[pool-grow_1.2s_ease-out]">
        {showHotZone && nearFifty && (
          <div
            className="pointer-events-none absolute inset-y-0 z-10 border-x-2 border-warn/70 bg-warn/15"
            style={{ left: "42%", width: "16%" }}
            title={copy.casino.hotZoneLabel}
          />
        )}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-up to-up/70"
          animate={{ width: `${py * 100}%` }}
          transition={{ type: "tween", duration: 0.6, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-down to-down/70"
          animate={{ width: `${(1 - py) * 100}%` }}
          transition={{ type: "tween", duration: 0.6, ease: "easeOut" }}
        />
      </div>
      {showHotZone && nearFifty && (
        <span className={cn("text-[10px] uppercase tracking-wider text-warn/90")}>
          {copy.casino.hotZoneLabel}
        </span>
      )}
    </div>
  );
}
