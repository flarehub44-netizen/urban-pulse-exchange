import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireGuestOnly } from "@/lib/auth-guards";
import { authModalRedirectTarget } from "@/lib/auth-modal-redirect";

export type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/auth/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    await requireGuestOnly();
    const redirectTo =
      typeof search.redirect === "string" && search.redirect ? search.redirect : "/markets";
    const { pathname, search: modalSearch } = authModalRedirectTarget(redirectTo, "login");
    throw redirect({
      to: pathname,
      search: { ...modalSearch, auth: "login", redirect: redirectTo },
    });
  },
  component: () => null,
});
