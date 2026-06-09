import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import type { MarketVertical } from "@/lib/catalog-market";

type CatalogSearchBarProps = {
  vertical: MarketVertical;
  initialQ?: string;
};

export function CatalogSearchBar({ vertical, initialQ = "" }: CatalogSearchBarProps) {
  const [q, setQ] = useState(initialQ);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({
      to: "/v/$vertical",
      params: { vertical },
      search: q ? { q } : {},
    });
  };

  return (
    <form onSubmit={submit} className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Pesquisar mercados…"
        className="w-full rounded-lg border border-border/70 bg-card py-2 pl-10 pr-3 text-sm"
      />
    </form>
  );
}
