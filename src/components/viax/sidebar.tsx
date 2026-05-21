import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { sidebarNav, settingsNav, notificationsNav, isNavActive } from "@/config/navigation";
import { useNavBadges } from "@/hooks/use-nav-badges";

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const { openPositions, unreadNotifications } = useNavBadges();

  return (
    <>
      <div
        className={cn(
          "px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 mb-2",
          collapsed && "sr-only",
        )}
      >
        ViaX
      </div>
      <nav className="flex-1 px-2 space-y-1" aria-label="Navegação principal">
        {sidebarNav.map((it) => {
          const active = isNavActive(path, it, search);
          const Icon = it.icon;
          return (
            <Link
              key={`${it.to}-${it.search?.tab ?? it.label}`}
              to={it.to}
              search={it.search}
              onClick={onNavigate}
              title={collapsed ? it.label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                collapsed && "justify-center px-2",
                active
                  ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_oklch(0.70_0.20_250/0.25)]"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary shadow-[var(--shadow-glow-primary)]" />
              )}
              <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
              {!collapsed && <span className="flex-1">{it.label}</span>}
              {!collapsed && it.to === "/profile" && it.matchPrefix && (
                <NavBadge count={openPositions} />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 px-3 py-3 space-y-1">
        <Link
          to={notificationsNav.to}
          onClick={onNavigate}
          title={collapsed ? notificationsNav.label : undefined}
          aria-current={path === notificationsNav.to ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            collapsed && "justify-center px-2",
            path === notificationsNav.to && "bg-primary/10 text-foreground",
          )}
        >
          <notificationsNav.icon className="size-4 shrink-0" />
          {!collapsed && <span className="flex-1">{notificationsNav.label}</span>}
          {!collapsed && <NavBadge count={unreadNotifications} />}
        </Link>
        <Link
          to="/profile"
          search={{ tab: "config" }}
          onClick={onNavigate}
          title={collapsed ? settingsNav.label : undefined}
          aria-current={path === "/profile" ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            collapsed && "justify-center px-2",
          )}
        >
          <settingsNav.icon className="size-4 shrink-0" />
          {!collapsed && settingsNav.label}
        </Link>
        {!collapsed && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-primary/80">UrbanMind AI</div>
            <div className="mt-1 text-xs text-muted-foreground">Confiança média 24h</div>
            <div className="mt-0.5 mono text-lg text-foreground">78.4%</div>
          </div>
        )}
      </div>
    </>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const width = collapsed ? "w-14" : "w-[240px]";

  return (
    <aside
      className={cn(
        "hidden lg:flex shrink-0 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur transition-[width] duration-200",
        width,
      )}
    >
      <div className={cn("flex items-center gap-2 px-3 py-5", collapsed && "flex-col gap-3 px-2")}>
        <Link
          to="/"
          className={cn("flex items-center gap-2 min-w-0", collapsed && "justify-center")}
        >
          <Logo />
          {!collapsed && (
            <>
              <span className="font-semibold tracking-tight">ViaX</span>
              <span className="ml-auto rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary">
                Beta
              </span>
            </>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            collapsed ? "mx-auto" : "ml-auto",
          )}
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>
      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}

export function MobileSidebarDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden size-9 shrink-0"
          aria-label="Abrir menu"
        >
          <PanelLeft className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] border-r bg-sidebar p-0">
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-5">
          <Logo />
          <span className="font-semibold tracking-tight">ViaX</span>
        </div>
        <div className="flex flex-col py-2">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="vxg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.18 240)" />
          <stop offset="100%" stopColor="oklch(0.70 0.20 290)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#vxg)" opacity="0.15" />
      <path
        d="M6 8 L13 24 L16 16 L19 24 L26 8"
        stroke="url(#vxg)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
