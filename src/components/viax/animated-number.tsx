import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  format?: (n: number) => string;
  duration?: number;
  flicker?: boolean;
}

export function AnimatedNumber({
  value, prefix, suffix, decimals = 0, className, format, duration = 600, flicker = true,
}: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [pulse, setPulse] = useState(0);
  const lastVal = useRef(value);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    if (flicker && Math.abs(value - lastVal.current) > 0.0001) {
      setPulse((p) => p + 1);
      lastVal.current = value;
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const out = format
    ? format(display)
    : `${prefix ?? ""}${display.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix ?? ""}`;

  return (
    <span key={pulse} className={cn("mono tabular-nums inline-block", flicker && "animate-[number-flicker_0.18s_ease-out]", className)}>
      {out}
    </span>
  );
}
