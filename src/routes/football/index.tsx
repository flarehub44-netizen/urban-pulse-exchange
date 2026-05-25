import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/football/")({
  beforeLoad: () => {
    throw redirect({ to: "/markets", search: { segment: "futebol" } });
  },
});
