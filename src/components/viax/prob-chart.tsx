import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Market } from "@/store/viax-store";

export function ProbChart({
  m,
  history,
  height = 280,
}: {
  m: Market;
  history?: { t: number; p: number }[];
  height?: number;
}) {
  const series = history?.length ? history : m.history;
  const data = series.map((h) => ({
    t: new Date(h.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    SIM: +(h.p * 100).toFixed(2),
    NAO: +((1 - h.p) * 100).toFixed(2),
  }));
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gSim" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-up)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-up)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gNao" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-down)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-down)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-muted-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="SIM"
            stroke="var(--color-up)"
            strokeWidth={1.6}
            fill="url(#gSim)"
          />
          <Area
            type="monotone"
            dataKey="NAO"
            stroke="var(--color-down)"
            strokeWidth={1.4}
            fill="url(#gNao)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
