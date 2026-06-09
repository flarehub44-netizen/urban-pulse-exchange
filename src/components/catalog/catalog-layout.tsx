import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/viax/page-header";
import { CatalogSidebar } from "@/components/catalog/catalog-sidebar";
import { CategoryFaq } from "@/components/catalog/category-faq";
import { VerticalChipsNav } from "@/components/catalog/vertical-chips-nav";
import type { MarketVertical } from "@/lib/catalog-market";
import { verticalLabel } from "@/lib/catalog-market";

type CatalogLayoutProps = {
  vertical: MarketVertical;
  topic?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  footerLinks?: { label: string; href: string }[];
};

export function CatalogLayout({
  vertical,
  topic,
  title,
  description,
  children,
  footerLinks,
}: CatalogLayoutProps) {
  return (
    <div className="space-y-4">
      <VerticalChipsNav active={vertical} />
      <PageHeader
        title={title ?? verticalLabel(vertical)}
        description={description ?? `Mercados de previsão — ${verticalLabel(vertical)}`}
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <CatalogSidebar
          vertical={vertical}
          activeTopic={topic}
          className="hidden lg:block lg:w-56 shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-8">{children}</div>
      </div>
      {footerLinks && footerLinks.length > 0 && (
        <div className="mt-10 border-t border-border/60 pt-6">
          <h3 className="mb-3 text-sm font-medium">Mercados populares</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {footerLinks.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="hover:text-primary hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <CategoryFaq vertical={vertical} className="mt-10" />
    </div>
  );
}
