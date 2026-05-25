/** Default landing path after auth based on deposit history. */
export function getDefaultPostAuthPath(hasDeposited: boolean): string {
  if (hasDeposited) return "/dashboard";
  return "/markets?status=live&deposit=1";
}

export function appendDepositSearch(
  search: Record<string, unknown>,
  wantDeposit: boolean,
): Record<string, unknown> {
  if (!wantDeposit) return search;
  return { ...search, deposit: "1" };
}
