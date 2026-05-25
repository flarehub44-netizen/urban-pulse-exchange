const REF_BOUND_KEY = "viax_ref_bound";

export function getBoundReferralSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REF_BOUND_KEY);
}

export function markReferralBound(slug: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REF_BOUND_KEY, slug);
}
