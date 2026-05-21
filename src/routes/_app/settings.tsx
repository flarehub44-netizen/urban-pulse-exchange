import { createFileRoute, redirect } from "@tanstack/react-router";

/** Settings moved into profile tab; keep route for bookmarks. */
export const Route = createFileRoute("/_app/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/profile", search: { tab: "config" } });
  },
});
