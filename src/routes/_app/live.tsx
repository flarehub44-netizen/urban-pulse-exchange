import { createFileRoute, Link } from "@tanstack/react-router";
import { useMarkets } from "@/hooks/use-markets";
import { useRegions } from "@/hooks/use-regions";
import { useViaX } from "@/store/viax-store";
import { CityHeatmap } from "@/components/viax/city-heatmap";
import { AnimatedNumber } from "@/components/viax/animated-number";
import { Radio, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/live")({
  head: () => ({ meta: [{ title: "Mapa ao vivo · ViaX" }, { name: "description", content: "Heatmap em tempo real do trânsito urbano e eventos ativos." }] }),
  component: Live,
});

function Live() {
  const { data: dbMarkets } = useMarkets();
  const zustandMarkets = useViaX((s) => s.markets);
  const markets = dbMarkets ?? zustandMarkets;
  const { data: dbRegions } = useRegions();
  const zustandRegions = useViaX((s) => s.regions);
  const regions = dbRegions ?? zustandRegions;

  const events = [
    { kind: "alerta", text: "Acidente reportado na Marginal Tietê altura Cebolão", time: "agora" },
    { kind: "evento", text: "Show no Vale do Anhangabaú aumenta fluxo de pedestres", time: "5 min" },
    { kind: "clima", text: "Chuva moderada prevista na zona oeste a partir das 17h30", time: "12 min" },
    { kind: "alerta", text: "Obras na Rebouças reduzem 1 faixa", time: "28 min" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mapa ao vivo · São Paulo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Heatmap de congestionamento e mercados ativos atualizando em tempo real.</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 rounded-full border bg-card px-3 py-1.5 text-xs">
          <span className="flex items-center gap-1.5 text-up"><span className="size-1.5 rounded-full bg-up animate-[pulse-glow_2s_ease-in-out_infinite]" /> Live</span>
          <span className="text-muted-foreground">{regions.length} regiões monitoradas</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <CityHeatmap height={560} />

        <div className="space-y-5">
          <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Regiões</h2>
            <ul className="space-y-2">
              {regions.map((r) => {
                const tone = r.congestion > 0.75 ? "text-down" : r.congestion > 0.5 ? "text-warn" : "text-up";
                return (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border bg-surface/40 p-2.5 text-sm">
                    <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${tone === "text-down" ? "bg-down" : tone === "text-warn" ? "bg-warn" : "bg-up"}`} /> {r.name}</div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="mono text-muted-foreground"><AnimatedNumber value={r.flow} /> /h</span>
                      <span className={`mono ${tone}`}><AnimatedNumber value={r.avgSpeed} decimals={0} /> km/h</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground"><AlertTriangle className="size-4 text-warn" /> Eventos detectados</h2>
            <ul className="space-y-2 text-sm">
              {events.map((e, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg border bg-surface/40 p-2.5">
                  <span className="mt-1 size-1.5 rounded-full bg-primary" />
                  <div className="flex-1">{e.text}</div>
                  <span className="text-[10px] mono text-muted-foreground">{e.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground"><Radio className="size-4 text-primary" /> Mercados ativos perto de você</h2>
            <ul className="space-y-2">
              {markets.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <Link to="/markets/$marketId" params={{ marketId: m.id }} className="flex items-center justify-between rounded-lg border bg-surface/40 p-2.5 text-sm hover:bg-surface">
                    <div className="min-w-0">
                      <div className="truncate">{m.region}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">{m.question}</div>
                    </div>
                    <span className="mono text-xs text-primary">abrir →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
