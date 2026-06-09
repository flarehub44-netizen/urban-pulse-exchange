import { useUnifiedCatalog } from "@/hooks/use-catalog-markets";
import { formatPct } from "@/lib/parimutuel";
import { Link } from "@tanstack/react-router";

export function CopaMapTab() {
  const { data } = useUnifiedCatalog({
    vertical: "copa",
    topic: "copa-2026",
    status: "live",
    limit: 1,
    q: "pm-copa-winner",
  });

  const outright = data?.find((m) => m.id === "pm-copa-winner-2026") ?? data?.[0];
  const top = outright?.outcomes.slice().sort((a, b) => b.probability - a.probability) ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-b from-primary/5 to-transparent p-8">
        <div className="relative size-64 rounded-full border border-primary/20 bg-primary/5">
          {top.slice(0, 8).map((o, i) => {
            const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 38;
            const y = 50 + Math.sin(angle) * 38;
            return (
              <span
                key={o.id}
                className="absolute text-[10px] font-medium text-primary"
                style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
              >
                {formatPct(o.probability, 0)}
              </span>
            );
          })}
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
            Campeão 2026
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {top.map((o) => (
          <div key={o.id} className="flex items-center gap-3">
            <span className="w-28 truncate text-sm">{o.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${o.probability * 100}%` }} />
            </div>
            <span className="w-12 text-right text-sm font-semibold tabular-nums">
              {formatPct(o.probability)}
            </span>
          </div>
        ))}
        {outright && (
          <Link
            to={outright.detailPath}
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Ver mercado completo →
          </Link>
        )}
      </div>
    </div>
  );
}
