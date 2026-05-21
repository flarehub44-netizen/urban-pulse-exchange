import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Radio, Map, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/markets",   label: "Mercados", icon: Radio },
  { to: "/live",      label: "Mapa", icon: Map },
  { to: "/ranking",   label: "Rank", icon: Trophy },
  { to: "/profile",   label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link to={it.to} className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px]",
                active ? "text-primary" : "text-muted-foreground",
              )}>
                <Icon className={cn("size-5", active && "drop-shadow-[0_0_8px_var(--color-primary)]")} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
