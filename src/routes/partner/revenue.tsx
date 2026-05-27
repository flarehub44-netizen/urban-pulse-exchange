import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePartnerRevenueSeries, usePartnerOverview } from "@/hooks/use-partner";
import { formatBRL } from "@/lib/parimutuel";
import { copy } from "@/copy/pt-BR";
import { EmptyState } from "@/components/viax/empty-state";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/partner/revenue")({
  component: PartnerRevenuePage,
});

function PartnerRevenuePage() {
  const [windowDays, setWindowDays] = useState<7 | 30 | 60>(30);
  const { data: series } = usePartnerRevenueSeries(windowDays);
  const { data: o } = usePartnerOverview();
  const chart = (series ?? []).map((p) => {
    const dt = new Date(p.day);
    return {
      day: dt,
      d: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      v: Number(p.amount),
    };
  });
  const totals = useMemo(() => {
    const current = chart.reduce((acc, row) => acc + row.v, 0);
    const average = chart.length > 0 ? current / chart.length : 0;
    const peak = chart.reduce((acc, row) => Math.max(acc, row.v), 0);
    const last = chart.at(-1)?.v ?? 0;
    return { current, average, peak, last };
  }, [chart]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.revenue}</h1>
      <p className="text-sm text-muted-foreground">
        Revenue share sobre rake · saldo disponível {formatBRL(o?.balance ?? 0)}
      </p>
      <div className="flex flex-wrap gap-2">
        {[7, 30, 60].map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setWindowDays(days as 7 | 30 | 60)}
            className={
              "rounded-lg border px-3 py-1.5 text-xs transition " +
              (windowDays === days
                ? "border-primary/60 bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-surface-2")
            }
          >
            {days} dias
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card/60 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total período</p>
          <p className="mt-1 text-lg font-semibold">{formatBRL(totals.current)}</p>
        </div>
        <div className="rounded-xl border bg-card/60 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Média diária</p>
          <p className="mt-1 text-lg font-semibold">{formatBRL(totals.average)}</p>
        </div>
        <div className="rounded-xl border bg-card/60 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Pico diário</p>
          <p className="mt-1 text-lg font-semibold">{formatBRL(totals.peak)}</p>
        </div>
        <div className="rounded-xl border bg-card/60 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Último dia</p>
          <p className="mt-1 text-lg font-semibold">{formatBRL(totals.last)}</p>
        </div>
      </div>

      {chart.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sem receita no período"
          description="Quando seus convites gerarem volume, a receita diária aparece aqui."
        />
      ) : (
        <div className="rounded-xl border bg-card/60 p-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <XAxis dataKey="d" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number) => formatBRL(v)}
                labelFormatter={(_, payload) => {
                  const day = payload?.[0]?.payload?.day as Date | undefined;
                  return day
                    ? day.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "";
                }}
              />
              <Bar dataKey="v" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
