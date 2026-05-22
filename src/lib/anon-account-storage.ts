const BANNER_DISMISS_KEY = "viax_anon_banner_dismiss";
const BET_ACK_KEY = "viax_anon_bet_ack";
const REF_BOUND_KEY = "viax_ref_bound";

function readExpiry(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const exp = Number(raw);
    return Number.isFinite(exp) && Date.now() < exp;
  } catch {
    return false;
  }
}

function writeExpiry(key: string, days: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, String(Date.now() + days * 864e5));
}

export function isAnonBannerDismissed(): boolean {
  return readExpiry(BANNER_DISMISS_KEY);
}

export function dismissAnonBanner(days = 7) {
  writeExpiry(BANNER_DISMISS_KEY, days);
}

export function hasAnonBetAck(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(BET_ACK_KEY) === "1";
}

export function setAnonBetAck() {
  if (typeof window === "undefined") return;
  localStorage.setItem(BET_ACK_KEY, "1");
}

export function getBoundReferralSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REF_BOUND_KEY);
}

export function markReferralBound(slug: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REF_BOUND_KEY, slug);
}
