/** Client-side flag: Pix via SyncPay is the default wallet path unless explicitly disabled. */
export function isPixPaymentsEnabled(): boolean {
  const flag = import.meta.env.VITE_PIX_PAYMENTS_ENABLED;
  if (typeof flag === "string") return flag !== "false";
  return true;
}
