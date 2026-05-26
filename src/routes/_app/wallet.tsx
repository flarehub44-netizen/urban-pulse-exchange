import { createFileRoute } from "@tanstack/react-router";
import { WalletPanel } from "@/components/viax/wallet-panel";

export type WalletSearch = {
  tab?: "overview" | "history" | "deposit" | "withdraw";
};

export const Route = createFileRoute("/_app/wallet")({
  head: () => ({
    meta: [
      { title: "Carteira · ViaX" },
      { name: "description", content: "Gerencie saldo, depósitos, saques e histórico financeiro." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): WalletSearch => ({
    tab:
      search.tab === "history" ||
      search.tab === "deposit" ||
      search.tab === "withdraw" ||
      search.tab === "overview"
        ? search.tab
        : undefined,
  }),
  component: WalletPage,
});

function WalletPage() {
  const { tab } = Route.useSearch();
  return <WalletPanel initialTab={tab} />;
}
