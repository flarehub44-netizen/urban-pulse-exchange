import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireGuestOnly } from "@/lib/auth-guards";
import { authModalRedirectTarget } from "@/lib/auth-modal-redirect";

export type SignupSearch = { redirect?: string };

export const Route = createFileRoute("/auth/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    await requireGuestOnly();
    const redirectTo =
      typeof search.redirect === "string" && search.redirect ? search.redirect : "/markets";
    const { pathname, search: modalSearch } = authModalRedirectTarget(redirectTo, "signup");
    throw redirect({
      to: pathname,
      search: { ...modalSearch, auth: "signup", redirect: redirectTo },
    });
  },
  component: () => null,
});
