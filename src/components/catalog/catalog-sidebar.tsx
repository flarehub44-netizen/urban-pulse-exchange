import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useCatalogTopicCounts } from "@/hooks/use-catalog-markets";
import type { MarketVertical } from "@/lib/catalog-market";

type CatalogSidebarProps = {
  vertical: MarketVertical;
  activeTopic?: string;
  className?: string;
};

export function CatalogSidebar({ vertical, activeTopic, className }: CatalogSidebarProps) {
  const { data: topics = [] } = useCatalogTopicCounts(vertical);

  return (
    <aside className={cn("space-y-1", className)}>
      <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Tópicos
      </p>
      <Link
        to="/v/$vertical"
        params={{ vertical }}
        className={cn(
          "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
          !activeTopic ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60",
        )}
      >
        <span>Todos</span>
      </Link>
      {topics.map((t) => (
        <Link
          key={t.slug}
          to="/v/$vertical/$topic"
          params={{ vertical, topic: t.slug }}
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
            activeTopic === t.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60",
          )}
        >
          <span>{t.label}</span>
          <span className="text-xs text-muted-foreground">{t.count}</span>
        </Link>
      ))}
    </aside>
  );
}
