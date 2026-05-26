/** Legacy catalog slugs superseded by *-live rows in production. */
export const MARKET_SLUG_ALIASES: Record<string, string> = {
  brigadeiro: "brigadeiro-live",
  "faria-lima": "faria-lima-live",
  "paulista-rush": "paulista-rush-live",
  "marginal-tietê": "marginal-tiete-live",
  rebouças: "reboucas-live",
};

/** All legacy urban seed ids (including those without a *-live replacement). */
export const LEGACY_MARKET_IDS = new Set([
  "paulista-rush",
  "marginal-tietê",
  "faria-lima",
  "23-maio",
  "rebouças",
  "anhangabaú",
  "imigrantes",
  "brigadeiro",
  ...Object.keys(MARKET_SLUG_ALIASES),
]);

export function resolveMarketRouteId(marketId: string): string {
  return MARKET_SLUG_ALIASES[marketId] ?? marketId;
}

export function isKnownLegacyMarketId(marketId: string): boolean {
  return LEGACY_MARKET_IDS.has(marketId);
}
