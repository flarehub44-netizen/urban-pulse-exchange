export function CopaBracket() {
  const rounds = ["Oitavas", "Quartas", "Semis", "Final"];
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[640px] gap-4">
        {rounds.map((round) => (
          <div key={round} className="flex-1 space-y-3">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {round}
            </p>
            {Array.from({ length: round === "Final" ? 1 : 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-dashed border-border/80 px-3 py-4 text-center text-xs text-muted-foreground"
              >
                A definir
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Chaveamento atualizado conforme jogos forem definidos pela API-Football.
      </p>
    </div>
  );
}
