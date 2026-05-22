const REF_KEY = "viax_ref";
const REF_CAMPAIGN_KEY = "viax_ref_campaign";
const COOKIE_DAYS = 30;

export type StoredRef = { slug: string; campaignId?: string };

export function storePartnerRef(slug: string, campaignId?: string) {
  if (typeof window === "undefined") return;
  const payload: StoredRef = { slug, campaignId };
  localStorage.setItem(REF_KEY, JSON.stringify(payload));
  const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
  document.cookie = `${REF_KEY}=${encodeURIComponent(slug)}; path=/; expires=${expires}; SameSite=Lax`;
  if (campaignId) {
    document.cookie = `${REF_CAMPAIGN_KEY}=${campaignId}; path=/; expires=${expires}; SameSite=Lax`;
  }
}

export function getStoredPartnerRef(): StoredRef | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredRef;
      if (parsed?.slug) return parsed;
    }
  } catch {
    /* ignore */
  }
  const match = document.cookie.match(new RegExp(`${REF_KEY}=([^;]+)`));
  if (match?.[1]) {
    return { slug: decodeURIComponent(match[1]) };
  }
  return null;
}

export function clearStoredPartnerRef() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REF_KEY);
  document.cookie = `${REF_KEY}=; path=/; max-age=0`;
  document.cookie = `${REF_CAMPAIGN_KEY}=; path=/; max-age=0`;
}
