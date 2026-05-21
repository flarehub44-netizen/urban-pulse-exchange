import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useViaX } from "@/store/viax-store";
import { MarketCard } from "@/components/viax/market-card";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/markets")({
  head: () => ({ meta: [{ title: "Mercados · ViaX" }, { name: "description", content: "Todos os mercados parimutuel ativos da exchange ViaX." }] }),
  component: Markets,
});

const filters = ["Todos", "Ao vivo", "Encerrando", "Fluxo", "Velocidade", "Congestionamento"] as const;
type F = (typeof filters)[number];

function Markets() {
  const markets = useViaX((s) => s.markets);
  const [filter, setFilter] = useState<F>("Todos");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    return markets.filter((m) => {
      if (q && !m.question.toLowerCase().includes(q.toLowerCase()) && !m.region.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "Todos") return true;
      if (filter === "Ao vivo") return m.status === "live";
      if (filter === "Encerrando") return m.status === "closing" || (m.endsAt - Date.now()) < 30*60_000;
      return m.category === filter;
    });
  }, [markets, filter, q]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mercados</h1>
          <p className="mt-1 text-sm text-muted-foreground">{list.length} mercados · pools atualizando ao vivo</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar mercado ou via..."
            className="w-full rounded-xl border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              filter === f
                ? "border-primary/60 bg-primary/15 text-primary shadow-[var(--shadow-glow-primary)]"
                : "border-border bg-card text-muted-foreground hover:bg-surface-2",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((m) => <MarketCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}
