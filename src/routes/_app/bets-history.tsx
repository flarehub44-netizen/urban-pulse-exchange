import { createFileRoute } from "@tanstack/react-router";
import {
  BetsHistoryPanel,
  type BetsHistoryFilter,
  type BetsHistoryType,
} from "@/components/viax/bets-history-panel";

type Search = {
  filter: BetsHistoryFilter;
  type: BetsHistoryType;
  q: string;
};

const ALLOWED_FILTER: BetsHistoryFilter[] = ["all", "open", "won", "lost", "refund"];
const ALLOWED_TYPE: BetsHistoryType[] = ["all", "traffic", "football"];

export const Route = createFileRoute("/_app/bets-history")({
  head: () => ({
    meta: [
      { title: "Histórico de apostas · ViaX" },
      {
        name: "description",
        content:
          "Veja todas as suas apostas — abertas, ganhas, perdidas e reembolsadas — com filtros e busca.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    filter: ALLOWED_FILTER.includes(search.filter as BetsHistoryFilter)
      ? (search.filter as BetsHistoryFilter)
      : "all",
    type: ALLOWED_TYPE.includes(search.type as BetsHistoryType)
      ? (search.type as BetsHistoryType)
      : "all",
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: BetsHistoryPage,
});

function BetsHistoryPage() {
  const { filter, type, q } = Route.useSearch();
  return <BetsHistoryPanel filter={filter} type={type} q={q} />;
}
