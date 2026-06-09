import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { CatalogLayout } from "@/components/catalog/catalog-layout";
import { CatalogMarketGrid } from "@/components/catalog/catalog-market-grid";
import { CopaGamesTab } from "@/components/copa/copa-games-tab";
import { CopaGroupsGrid } from "@/components/copa/copa-groups-grid";
import { CopaMapTab } from "@/components/copa/copa-map-tab";
import { CopaBracket } from "@/components/copa/world-cup-bracket";

type CopaTab = "jogos" | "props" | "grupos" | "chaveamento" | "mapa";

const TABS: { id: CopaTab; label: string }[] = [
  { id: "jogos", label: "Jogos" },
  { id: "props", label: "Props" },
  { id: "grupos", label: "Grupos" },
  { id: "chaveamento", label: "Chaveamento" },
  { id: "mapa", label: "Mapa" },
];

export const Route = createFileRoute("/copa/")({
  component: CopaHubPage,
});

function CopaHubPage() {
  const [tab, setTab] = useState<CopaTab>("jogos");

  return (
    <CatalogLayout
      vertical="copa"
      title="Copa do Mundo"
      description="Cotações e previsões da Copa do Mundo ao vivo."
    >
      <div className="flex gap-2 overflow-x-auto border-b border-border/60 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition",
              tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "jogos" && <CopaGamesTab />}
      {tab === "props" && (
        <CatalogMarketGrid vertical="copa" topic="props-copa" status="live" sort="volume" />
      )}
      {tab === "grupos" && <CopaGroupsGrid />}
      {tab === "chaveamento" && <CopaBracket />}
      {tab === "mapa" && <CopaMapTab />}
    </CatalogLayout>
  );
}
