const LAST_AMOUNT_KEY = "viax_impulse_last_amount";

export const IMPULSE_CHIP_AMOUNTS = [50, 100, 200, 500, 1000] as const;

export function getLastImpulseAmount(): number {
  if (typeof localStorage === "undefined") return 100;
  const v = Number(localStorage.getItem(LAST_AMOUNT_KEY));
  return IMPULSE_CHIP_AMOUNTS.includes(v as (typeof IMPULSE_CHIP_AMOUNTS)[number]) ? v : 100;
}

export function setLastImpulseAmount(amount: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LAST_AMOUNT_KEY, String(amount));
}

export const LOW_BALANCE_THRESHOLD = 80;
