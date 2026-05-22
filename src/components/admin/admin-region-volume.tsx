import { useAdminVolumeByRegion } from "@/hooks/use-admin-dashboard";
import { formatBRL } from "@/lib/parimutuel";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AdminRegionVolumeChart() {
  const { data } = useAdminVolumeByRegion();

  const chartData = (data ?? []).map((r) => ({
    name: r.region.length > 12 ? `${r.region.slice(0, 12)}…` : r.region,
    volume: Number(r.volume),
    bets: r.bet_count,
  }));

  if (!chartData.length) {
    return <p className="text-xs text-muted-foreground">Sem volume por região hoje.</p>;
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 9 }} />
          <Tooltip formatter={(v: number) => formatBRL(v)} />
          <Bar dataKey="volume" fill="oklch(0.76 0.18 152)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
