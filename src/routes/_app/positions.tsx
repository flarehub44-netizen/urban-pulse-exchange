import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/positions")({
  beforeLoad: () => {
    throw redirect({ to: "/profile", search: { tab: "posicoes" } });
  },
});
