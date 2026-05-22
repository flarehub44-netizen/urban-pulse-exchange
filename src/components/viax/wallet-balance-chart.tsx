import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { d: string; v: number };

export function WalletBalanceChart({ data }: { data: Point[] }) {
  return (
    <div style={{ width: "100%", height: 160 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="d" hide />
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
            dataKey="v"
            stroke="var(--color-primary)"
            strokeWidth={1.8}
            fill="url(#wg)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
