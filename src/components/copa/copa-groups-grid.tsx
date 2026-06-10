import { Link } from "@tanstack/react-router";
import { useCopaStandings } from "@/hooks/use-copa-football-data";
import { CatalogMarketGrid } from "@/components/catalog/catalog-market-grid";

function groupKey(group: string | null): string {
  if (!group) return "Outros";
  const m = group.match(/Group\s+([A-L])/i);
  return m ? `Grupo ${m[1]!.toUpperCase()}` : group;
}

export function CopaGroupsGrid() {
  const { data: standings = [], isLoading } = useCopaStandings();

  const grouped = standings.reduce<Record<string, typeof standings>>((acc, row) => {
    const key = groupKey(row.group);
    acc[key] = acc[key] ?? [];
    acc[key].push(row);
    return acc;
  }, {});

  const hasLiveStandings = Object.keys(grouped).length > 0;

  return (
    <div className="space-y-8">
      {hasLiveStandings && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Classificação (API-Football)</h3>
            <Link to="/copa" className="text-xs text-primary hover:underline">
              Mercados de grupos ↓
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([label, rows]) => (
                <div key={label} className="rounded-xl border border-border/70 bg-card/40 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <ol className="space-y-1.5 text-xs">
                    {rows
                      .slice()
                      .sort((a, b) => a.rank - b.rank)
                      .map((r) => (
                        <li key={r.teamId} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            <span className="tabular-nums text-muted-foreground">{r.rank}.</span>{" "}
                            {r.teamName}
                          </span>
                          <span className="shrink-0 tabular-nums font-medium">{r.points} pts</span>
                        </li>
                      ))}
                  </ol>
                </div>
              ))}
          </div>
        </section>
      )}

      {isLoading && !hasLiveStandings && (
        <p className="text-sm text-muted-foreground">Carregando classificação…</p>
      )}

      <CatalogMarketGrid
        vertical="copa"
        topic="grupos-copa"
        status="live"
        sort="volume"
        emptyTitle="Mercados de grupos em breve"
      />
    </div>
  );
}
