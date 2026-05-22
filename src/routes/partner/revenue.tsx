import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePartnerRevenueSeries, usePartnerOverview } from "@/hooks/use-partner";
import { formatBRL } from "@/lib/parimutuel";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/partner/revenue")({
  component: PartnerRevenuePage,
});

function PartnerRevenuePage() {
  const { data: series } = usePartnerRevenueSeries(60);
  const { data: o } = usePartnerOverview();
  const chart = (series ?? []).map((p) => ({
    d: new Date(p.day).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    v: Number(p.amount),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.revenue}</h1>
      <p className="text-sm text-muted-foreground">
        Revenue share sobre rake · saldo disponível {formatBRL(o?.balance ?? 0)}
      </p>
      <div className="rounded-xl border bg-card/60 p-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <XAxis dataKey="d" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Bar dataKey="v" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
