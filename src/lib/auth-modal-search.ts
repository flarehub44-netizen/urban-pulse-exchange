export type AuthModalMode = "login" | "signup" | "forgot";

export type AuthModalSearch = {
  auth?: AuthModalMode;
  redirect?: string;
  upgrade?: "1";
  deposit?: "1";
};

export function parseAuthModalSearch(search: Record<string, unknown>): AuthModalSearch {
  const auth = search.auth;
  const validAuth = auth === "login" || auth === "signup" || auth === "forgot" ? auth : undefined;
  return {
    auth: validAuth,
    redirect: typeof search.redirect === "string" && search.redirect ? search.redirect : undefined,
    upgrade: search.upgrade === "1" ? "1" : undefined,
    deposit: search.deposit === "1" ? "1" : undefined,
  };
}

export const AUTH_MODAL_SEARCH_KEYS = ["auth", "redirect", "upgrade", "deposit"] as const;

export function stripAuthModalSearch<T extends Record<string, unknown>>(search: T): T {
  const next = { ...search };
  for (const key of AUTH_MODAL_SEARCH_KEYS) {
    delete next[key];
  }
  return next;
}
