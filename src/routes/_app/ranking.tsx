import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTraders } from "@/hooks/use-traders";
import { useViaX } from "@/store/viax-store";
import { DivisionBadge } from "@/components/viax/division-badge";
import { formatBRL } from "@/lib/parimutuel";
import { Crown, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ranking")({
  head: () => ({ meta: [{ title: "Ranking · ViaX" }, { name: "description", content: "Leaderboards globais, por cidade, bairro e amigos." }] }),
  component: Ranking,
});

const tabs = ["Global", "Cidade", "Bairro", "Amigos"] as const;
type T = (typeof tabs)[number];

function Ranking() {
  const { data: dbTraders } = useTraders();
  const zustandTraders = useViaX((s) => s.traders);
  const traders = dbTraders ?? zustandTraders;
  const [tab, setTab] = useState<T>("Global");

  const list = tab === "Cidade"  ? traders.filter((t) => t.city === "São Paulo")
            : tab === "Bairro"   ? traders.filter((t) => t.neighborhood === "Pinheiros")
            : tab === "Amigos"   ? traders.slice(0, 4)
            : traders;

  const podium = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ranking</h1>
        <p className="mt-1 text-sm text-muted-foreground">Os melhores traders urbanos da exchange.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("rounded-full border px-3 py-1.5 text-xs",
              tab === t ? "border-primary/60 bg-primary/15 text-primary shadow-[var(--shadow-glow-primary)]" : "border-border bg-card text-muted-foreground hover:bg-surface-2")}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {podium.map((t, i) => {
          const Icon = i === 0 ? Crown : i === 1 ? Trophy : Medal;
          const tone = i === 0 ? "text-yellow-300" : i === 1 ? "text-slate-200" : "text-amber-400";
          return (
            <div key={t.id} className={cn("relative overflow-hidden rounded-2xl border bg-card/60 p-5 backdrop-blur", i === 0 && "border-yellow-400/40 shadow-[0_0_50px_-12px_oklch(0.84_0.17_85/0.45)]")}>
              <div className="absolute right-4 top-4"><Icon className={cn("size-6", tone)} /></div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">#{i + 1}</div>
              <div className="mt-3 flex items-center gap-3">
                <img src={t.avatar} className="size-14 rounded-full border bg-surface" alt="" />
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">@{t.handle}</div>
                  <DivisionBadge division={t.division} className="mt-1" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <Box label="Accuracy" value={`${(t.accuracy*100).toFixed(1)}%`} />
                <Box label="ROI" value={`+${(t.roi*100).toFixed(0)}%`} tone="up" />
                <Box label="Streak" value={`🔥 ${t.streak}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card/60 backdrop-blur">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Trader</th>
              <th className="px-4 py-3 text-left">Divisão</th>
              <th className="px-4 py-3 text-right">Accuracy</th>
              <th className="hidden sm:table-cell px-4 py-3 text-right">ROI</th>
              <th className="hidden md:table-cell px-4 py-3 text-right">Streak</th>
              <th className="hidden md:table-cell px-4 py-3 text-right">Volume</th>
              <th className="hidden lg:table-cell px-4 py-3 text-right">7d</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((t, i) => (
              <tr key={t.id} className="border-t border-border/60 hover:bg-surface/40">
                <td className="px-4 py-3 mono text-muted-foreground">{i + 4}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={t.avatar} className="size-8 rounded-full bg-surface" alt="" />
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[11px] text-muted-foreground">@{t.handle} · {t.neighborhood}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><DivisionBadge division={t.division} /></td>
                <td className="px-4 py-3 text-right mono">{(t.accuracy*100).toFixed(1)}%</td>
                <td className="hidden sm:table-cell px-4 py-3 text-right mono text-up">+{(t.roi*100).toFixed(0)}%</td>
                <td className="hidden md:table-cell px-4 py-3 text-right mono">🔥 {t.streak}</td>
                <td className="hidden md:table-cell px-4 py-3 text-right mono">{formatBRL(t.volume)}</td>
                <td className="hidden lg:table-cell px-4 py-3 text-right mono">
                  <span className={t.weeklyGrowth >= 0 ? "text-up" : "text-down"}>{t.weeklyGrowth >= 0 ? "▲" : "▼"} {(Math.abs(t.weeklyGrowth)*100).toFixed(1)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Box({ label, value, tone }: { label: string; value: string; tone?: "up" }) {
  return (
    <div className="rounded-lg border bg-surface/60 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm mono", tone === "up" && "text-up")}>{value}</div>
    </div>
  );
}
