import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireGuestOnly } from "@/lib/auth-guards";
import { authModalRedirectTarget } from "@/lib/auth-modal-redirect";

export type SignupSearch = { upgrade?: string; redirect?: string };

export const Route = createFileRoute("/auth/signup")({
  beforeLoad: async ({ search }) => {
    await requireGuestOnly();
    const redirectTo =
      typeof search.redirect === "string" && search.redirect ? search.redirect : "/markets";
    const upgrade = search.upgrade === "1" ? "1" : undefined;
    const { pathname, search: modalSearch } = authModalRedirectTarget(redirectTo, "signup");
    throw redirect({
      to: pathname,
      search: { ...modalSearch, auth: "signup", redirect: redirectTo, upgrade },
    });
  },
  component: () => null,
});
