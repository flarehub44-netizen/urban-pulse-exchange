import { createFileRoute } from "@tanstack/react-router";
import { PositionsPanel } from "@/components/viax/positions-panel";

export const Route = createFileRoute("/_app/positions")({
  head: () => ({
    meta: [
      { title: "Posições · ViaX" },
      { name: "description", content: "Acompanhe suas posições abertas, resolvidas e desempenho." },
    ],
  }),
  component: PositionsPage,
});

function PositionsPage() {
  return <PositionsPanel />;
}
