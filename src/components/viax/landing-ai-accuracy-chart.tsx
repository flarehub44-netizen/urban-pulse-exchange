import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { copy } from "@/copy/pt-BR";

type Point = { t: number; ai: number; human: number };

export function LandingAiAccuracyChart({ data }: { data: Point[] }) {
  const chartData = data.map((d) => ({
    t: new Date(d.t).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    AI: +(d.ai * 100).toFixed(1),
    H: +(d.human * 100).toFixed(1),
  }));

  return (
    <div className="surface-card-featured">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">{copy.landing.chartTitle}</div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-primary">
            <span className="size-2 rounded-full bg-primary" /> UrbanMind
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full bg-muted-foreground" /> Comunidade
          </span>
        </div>
      </div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <XAxis
              dataKey="t"
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={32}
            />
            <YAxis
              domain={[50, 90]}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="AI"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="H"
              stroke="var(--color-muted-foreground)"
              strokeWidth={1.6}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
