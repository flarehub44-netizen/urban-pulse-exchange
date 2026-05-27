/** Real partner Pix payouts require platform flag + SyncPay (off by default). */
export function isPartnerPayoutsReal(): boolean {
  const flag = import.meta.env.VITE_PARTNER_PAYOUTS_ENABLED;
  return flag === "true";
}
