import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireGuestOnly } from "@/lib/auth-guards";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => requireGuestOnly(),
  component: () => <Outlet />,
});
