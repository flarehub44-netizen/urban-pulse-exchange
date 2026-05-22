import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  to: number;
  className?: string;
  /** Show pulse animation below this threshold (ms). Default: 5 min */
  urgentThreshold?: number;
}

export function Countdown({ to, className, urgentThreshold = 5 * 60_000 }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, to - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const urgent = diff < urgentThreshold;
  const closing = diff < 30 * 60_000;
  return (
    <span
      className={cn(
        "mono tabular-nums",
        urgent ? "text-warn animate-pulse" : closing ? "text-warn/80" : "text-muted-foreground",
        className,
      )}
    >
      {h > 0 ? `${h}h ` : ""}
      {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s
    </span>
  );
}
