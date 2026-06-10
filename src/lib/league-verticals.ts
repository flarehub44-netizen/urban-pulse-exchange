export const LEAGUE_VERTICAL_OPTIONS = [
  { id: "platform", label: "Trânsito / plataforma" },
  { id: "prediction", label: "Previsões" },
  { id: "football", label: "Futebol" },
  { id: "crypto", label: "Crypto" },
] as const;

export type LeagueVerticalId = (typeof LEAGUE_VERTICAL_OPTIONS)[number]["id"];

export function formatLeagueVerticals(verticals?: string[] | null): string {
  if (!verticals?.length) return "Todas as categorias";
  return verticals
    .map((id) => LEAGUE_VERTICAL_OPTIONS.find((o) => o.id === id)?.label ?? id)
    .join(" · ");
}
