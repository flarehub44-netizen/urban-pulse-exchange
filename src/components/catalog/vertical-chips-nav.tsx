import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { MARKET_VERTICALS, type MarketVertical } from "@/lib/catalog-market";

type VerticalChipsNavProps = {
  active?: MarketVertical | "trending";
  className?: string;
};

export function VerticalChipsNav({ active, className }: VerticalChipsNavProps) {
  return (
    <nav
      className={cn(
        "flex gap-2 overflow-x-auto pb-2 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]",
        className,
      )}
    >
      <Link
        to="/"
        className={cn(
          "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
          active === "trending"
            ? "border-primary bg-primary/15 text-primary"
            : "border-border/70 hover:bg-muted/50",
        )}
      >
        Tendências
      </Link>
      {MARKET_VERTICALS.map((v) => (
        <Link
          key={v.slug}
          to={v.slug === "copa" ? "/copa" : "/v/$vertical"}
          params={v.slug === "copa" ? undefined : { vertical: v.slug }}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            active === v.slug
              ? "border-primary bg-primary/15 text-primary"
              : "border-border/70 hover:bg-muted/50",
          )}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  );
}
