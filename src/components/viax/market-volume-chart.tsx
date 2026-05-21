import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Mock volume bars derived from probability history deltas. */
export function MarketVolumeChart({
  history,
  height = 120,
}: {
  history: { t: number; p: number }[];
  height?: number;
}) {
  const data = useMemo(() => {
    if (history.length < 2) {
      return Array.from({ length: 12 }, (_, i) => ({
        t: `${i * 5}m`,
        vol: 400 + ((i * 137) % 900),
      }));
    }
    return history.slice(-24).map((h, i, arr) => {
      const prev = arr[i - 1]?.p ?? h.p;
      const vol = Math.round(320 + Math.abs(h.p - prev) * 4200 + (i % 5) * 180);
      return {
        t: new Date(h.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        vol,
      };
    });
  }, [history]);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="t"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "var(--color-primary)", opacity: 0.08 }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: 11,
            }}
            formatter={(v: number) => [`${v.toLocaleString("pt-BR")}`, "Volume"]}
          />
          <Bar dataKey="vol" fill="var(--color-primary)" opacity={0.75} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
