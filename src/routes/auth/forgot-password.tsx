import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireGuestOnly } from "@/lib/auth-guards";

export const Route = createFileRoute("/auth/forgot-password")({
  beforeLoad: async () => {
    await requireGuestOnly();
    throw redirect({ to: "/markets", search: { auth: "forgot" } });
  },
  component: () => null,
});
