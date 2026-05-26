export type ProductEventName =
  | "view_dashboard"
  | "click_deposit"
  | "deposit_qr_generated"
  | "deposit_confirmed"
  | "open_positions_viewed"
  | "market_opened_from_dashboard"
  | "wallet_tab_changed"
  | "first_bet_after_deposit"
  | "dashboard_cta_variant_assigned";

type EventProps = Record<string, string | number | boolean | undefined>;

const EVENT_NAME = "viax:product_event";

export function trackProductEvent(event: ProductEventName, props?: EventProps) {
  if (typeof window === "undefined") return;
  const detail = { event, ...props, ts: Date.now() };
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
  if (import.meta.env.DEV) {
    console.debug("[product_event]", detail);
  }
}

export function getOrAssignVariant(
  key: string,
  variants: readonly string[],
  seed?: string,
): string {
  if (typeof window === "undefined" || variants.length === 0) return variants[0] ?? "control";
  const storageKey = `viax_exp_${key}`;
  const cached = localStorage.getItem(storageKey);
  if (cached && variants.includes(cached)) return cached;
  const bucketBase = `${seed ?? "anon"}:${key}`;
  const hash = Array.from(bucketBase).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const assigned = variants[hash % variants.length] ?? variants[0];
  localStorage.setItem(storageKey, assigned);
  return assigned;
}
