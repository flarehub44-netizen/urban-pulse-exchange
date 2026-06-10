import { Link } from "@tanstack/react-router";
import { useUnifiedCatalog } from "@/hooks/use-catalog-markets";
import { useCopaStandings } from "@/hooks/use-copa-football-data";
import { formatPct } from "@/lib/parimutuel";
import { cn } from "@/lib/utils";

const TEAM_COUNTRY: Record<string, string> = {
  Brasil: "BR",
  Argentina: "AR",
  França: "FR",
  Espanha: "ES",
  Inglaterra: "GB",
  Alemanha: "DE",
  Portugal: "PT",
  Holanda: "NL",
  Itália: "IT",
  Uruguai: "UY",
  Colômbia: "CO",
  México: "MX",
  "Estados Unidos": "US",
  Canadá: "CA",
};

function flagEmoji(code: string) {
  if (code.length !== 2) return "🏳️";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

export function CopaMapTab() {
  const { data: catalog } = useUnifiedCatalog({
    vertical: "copa",
    topic: "copa-2026",
    status: "live",
    limit: 1,
    q: "pm-copa-winner",
  });
  const { data: standings = [] } = useCopaStandings();

  const outright = catalog?.find((m) => m.id === "pm-copa-winner-2026") ?? catalog?.[0];
  const top = outright?.outcomes.slice().sort((a, b) => b.probability - a.probability) ?? [];

  const editorialFallback =
    top.length === 0
      ? standings.slice(0, 12).map((s, i) => ({
          id: String(s.teamId),
          label: s.teamName,
          probability: Math.max(0.02, 0.2 - i * 0.012),
        }))
      : top;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-b from-primary/5 to-transparent p-8">
        <div className="relative size-72 rounded-full border border-primary/20 bg-primary/5 shadow-inner">
          {editorialFallback.slice(0, 12).map((o, i) => {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 40;
            const y = 50 + Math.sin(angle) * 40;
            const cc = TEAM_COUNTRY[o.label] ?? "XX";
            return (
              <div
                key={o.id}
                className="absolute flex flex-col items-center text-center"
                style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
              >
                <span className="text-lg" title={o.label}>
                  {flagEmoji(cc)}
                </span>
                <span className="mt-0.5 max-w-[52px] truncate text-[9px] font-medium">
                  {o.label.split(" ").pop()}
                </span>
                <span className="text-[10px] tabular-nums text-primary">
                  {formatPct(o.probability, 0)}
                </span>
              </div>
            );
          })}
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
            Campeão 2026
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {top.length ? "Probabilidades do mercado outright" : "Fallback editorial (API/grupos)"}
        </p>
        {editorialFallback.slice(0, 16).map((o, i) => (
          <div key={o.id} className="flex items-center gap-3">
            <span className="w-6 text-xs text-muted-foreground">{i + 1}</span>
            <span className="w-32 truncate text-sm">{o.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full bg-primary transition-all")}
                style={{ width: `${Math.min(100, o.probability * 100)}%` }}
              />
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
            Ver mercado completo ({outright.outcomes.length} seleções) →
          </Link>
        )}
      </div>
    </div>
  );
}
