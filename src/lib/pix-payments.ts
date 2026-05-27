/** Valor mínimo para depósito e saque Pix (BRL). */
export const PIX_MIN_AMOUNT_BRL = 10;

/** Client-side flag: Pix via SyncPay is the default wallet path unless explicitly disabled. */
export function isPixPaymentsEnabled(): boolean {
  const flag = import.meta.env.VITE_PIX_PAYMENTS_ENABLED;
  if (typeof flag === "string") return flag !== "false";
  return true;
}
