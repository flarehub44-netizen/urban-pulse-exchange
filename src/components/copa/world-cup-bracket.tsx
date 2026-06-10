import { useCopaKnockout } from "@/hooks/use-copa-football-data";

const ROUND_LABELS: Record<string, string> = {
  "Round of 16": "Oitavas",
  "Quarter-finals": "Quartas",
  "Semi-finals": "Semis",
  Final: "Final",
};

export function CopaBracket() {
  const { data: fixtures = [], isLoading } = useCopaKnockout();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando chaveamento…</p>;
  }

  if (!fixtures.length) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Chaveamento disponível quando a fase eliminatória começar (dados API-Football).
      </p>
    );
  }

  const byRound = fixtures.reduce<Record<string, typeof fixtures>>((acc, f) => {
    const round =
      (f.raw as { league?: { round?: string } })?.league?.round ?? f.league_name ?? "Knockout";
    const label = ROUND_LABELS[round] ?? round;
    acc[label] = acc[label] ?? [];
    acc[label].push(f);
    return acc;
  }, {});

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[640px] gap-4">
        {Object.entries(byRound).map(([round, items]) => (
          <div key={round} className="flex-1 space-y-3">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {round}
            </p>
            {items.map((f) => (
              <div
                key={f.api_fixture_id}
                className="rounded-lg border border-border/80 px-3 py-3 text-xs"
              >
                <div className="font-medium">{f.home_team_name}</div>
                <div className="text-muted-foreground">vs</div>
                <div className="font-medium">{f.away_team_name}</div>
                {f.goals_home != null && f.goals_away != null && (
                  <div className="mt-1 tabular-nums text-primary">
                    {f.goals_home} – {f.goals_away}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
