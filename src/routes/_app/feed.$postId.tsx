import { createFileRoute, redirect } from "@tanstack/react-router";

/** Deep link: /feed/$postId → /feed?post= */
export const Route = createFileRoute("/_app/feed/$postId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/feed", search: { post: params.postId } });
  },
});
