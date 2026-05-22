import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { partnerNav, isPartnerNavActive } from "@/config/partner-navigation";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

export function PartnerLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border/60 bg-sidebar lg:flex">
          <div className="border-b border-border/60 px-4 py-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-4" />
              <span className="text-sm font-semibold">{copy.partner.title}</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{copy.partner.subtitle}</p>
          </div>
          <nav className="flex-1 space-y-0.5 p-2">
            {partnerNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition",
                    isPartnerNavActive(path, item)
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border/60 p-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent"
            >
              <ArrowLeft className="size-3.5" />
              {copy.partner.backToApp}
            </Link>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-1 overflow-x-auto border-b px-2 py-2 lg:hidden">
            {partnerNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 text-[10px]",
                  isPartnerNavActive(path, item)
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
