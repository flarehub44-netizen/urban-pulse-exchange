import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Shield, ArrowLeft } from "lucide-react";
import { adminNav, isAdminNavActive } from "@/config/admin-navigation";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

export function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navGroups = [
    {
      key: "ops",
      label: "Operação",
      items: adminNav.filter((it) =>
        [
          "/admin",
          "/admin/markets",
          "/admin/football",
          "/admin/traffic-events",
          "/admin/settlement",
          "/admin/risk",
        ].includes(it.to),
      ),
    },
    {
      key: "growth",
      label: "Growth",
      items: adminNav.filter((it) =>
        ["/admin/partners", "/admin/events", "/admin/users", "/admin/intelligence"].includes(it.to),
      ),
    },
    {
      key: "platform",
      label: "Plataforma",
      items: adminNav.filter((it) =>
        ["/admin/finance", "/admin/sources", "/admin/system", "/admin/simulator"].includes(it.to),
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border/60 bg-sidebar lg:flex">
          <div className="border-b border-border/60 px-4 py-4">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="size-4" />
              <span className="text-sm font-semibold">{copy.admin.title}</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{copy.admin.subtitle}</p>
          </div>
          <nav className="flex-1 space-y-3 p-2" aria-label="Admin">
            {navGroups.map((group) => (
              <div key={group.key}>
                <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isAdminNavActive(path, item);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition",
                          active
                            ? "bg-primary/15 text-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-border/60 p-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              {copy.admin.backToApp}
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center gap-3 border-b border-border/60 px-4 lg:hidden">
            <Shield className="size-4 text-primary" />
            <span className="text-sm font-medium">{copy.admin.title}</span>
            <Link to="/dashboard" className="ml-auto text-xs text-primary">
              {copy.nav.backToApp}
            </Link>
          </header>
          <div className="flex gap-1 overflow-x-auto border-b border-border/60 px-2 py-2 lg:hidden">
            {adminNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-[10px]",
                  isAdminNavActive(path, item)
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
