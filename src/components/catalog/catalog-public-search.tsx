import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useUnifiedCatalog } from "@/hooks/use-catalog-markets";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type CatalogPublicSearchProps = {
  className?: string;
  variant?: "button" | "icon";
};

export function CatalogPublicSearch({ className, variant = "button" }: CatalogPublicSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: results = [], isFetching } = useUnifiedCatalog({
    q: query.trim().length >= 2 ? query.trim() : undefined,
    status: "live",
    limit: 12,
  });

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate({ to: path });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          variant === "button"
            ? "flex items-center gap-1.5 rounded-lg border border-border/70 px-2.5 py-1 text-xs hover:bg-muted/50"
            : "rounded-lg p-2 hover:bg-muted/50",
          className,
        )}
        aria-label="Buscar mercados"
      >
        <Search className="size-3.5" />
        {variant === "button" && <span>Buscar</span>}
      </button>
      <CommandDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQuery("");
        }}
      >
        <CommandInput
          placeholder="Buscar mercados (Copa, Bitcoin, trânsito…)"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query.trim().length < 2
              ? "Digite ao menos 2 caracteres"
              : isFetching
                ? "Buscando…"
                : "Nenhum mercado encontrado"}
          </CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Mercados">
              {results.map((m) => (
                <CommandItem key={m.id} value={m.question} onSelect={() => go(m.detailPath)}>
                  <span className="truncate">{m.question}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Categorias">
            <CommandItem onSelect={() => go("/v/crypto")}>Crypto</CommandItem>
            <CommandItem onSelect={() => go("/copa")}>Copa do Mundo 2026</CommandItem>
            <CommandItem onSelect={() => go("/v/politica")}>Política</CommandItem>
            <CommandItem onSelect={() => go("/v/transito")}>Trânsito</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
