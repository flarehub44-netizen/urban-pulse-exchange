import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout sem guard — login/signup usam requireGuestOnly; callback processa tokens. */
export const Route = createFileRoute("/auth")({
  component: () => <Outlet />,
});
