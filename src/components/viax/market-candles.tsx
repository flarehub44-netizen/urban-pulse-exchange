import { useMemo } from "react";

/** Mock OHLC candles from probability history (visual only). */
export function MarketCandles({
  history,
  height = 100,
}: {
  history: { t: number; p: number }[];
  height?: number;
}) {
  const candles = useMemo(() => {
    const src =
      history.length >= 8
        ? history.slice(-16)
        : Array.from({ length: 16 }, (_, i) => ({
            t: Date.now() - (16 - i) * 120_000,
            p: 0.45 + Math.sin(i / 2) * 0.12,
          }));
    return src.map((h, i) => {
      const prev = src[i - 1]?.p ?? h.p;
      const open = prev * 100;
      const close = h.p * 100;
      const high = Math.max(open, close) + 2 + (i % 3);
      const low = Math.min(open, close) - 2 - (i % 2);
      const up = close >= open;
      return { open, close, high, low, up };
    });
  }, [history]);

  const min = Math.min(...candles.map((c) => c.low));
  const max = Math.max(...candles.map((c) => c.high));
  const range = max - min || 1;

  const toY = (v: number) => height - 8 - ((v - min) / range) * (height - 16);

  return (
    <div
      className="w-full overflow-hidden rounded-lg border bg-background/30 px-2 py-2"
      style={{ height }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${candles.length * 14} ${height}`}
        preserveAspectRatio="none"
      >
        {candles.map((c, i) => {
          const x = i * 14 + 7;
          const color = c.up ? "var(--color-up)" : "var(--color-down)";
          const bodyTop = toY(Math.max(c.open, c.close));
          const bodyBot = toY(Math.min(c.open, c.close));
          const bodyH = Math.max(2, bodyBot - bodyTop);
          return (
            <g key={i}>
              <line
                x1={x}
                x2={x}
                y1={toY(c.high)}
                y2={toY(c.low)}
                stroke={color}
                strokeWidth={1}
                opacity={0.7}
              />
              <rect x={x - 4} y={bodyTop} width={8} height={bodyH} fill={color} rx={1} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
