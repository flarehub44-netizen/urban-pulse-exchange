import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { d: string; pnl: number };

export function DashboardPnlChart({ data, showHint }: { data: Point[]; showHint: string }) {
  return (
    <>
      <div style={{ width: "100%", height: 140 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="pn" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-up)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-up)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="d" hide={data.length > 8} tick={{ fontSize: 10 }} />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke="var(--color-up)"
              strokeWidth={1.6}
              fill="url(#pn)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {showHint ? (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">{showHint}</p>
      ) : null}
    </>
  );
}
