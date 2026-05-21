import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Radio, Map, Trophy, MessageSquare, Brain, Wallet, User, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/markets",   label: "Mercados", icon: Radio },
  { to: "/live",      label: "Ao Vivo", icon: Map },
  { to: "/ranking",   label: "Ranking", icon: Trophy },
  { to: "/feed",      label: "Feed", icon: MessageSquare },
  { to: "/urbanmind", label: "UrbanMind AI", icon: Brain },
  { to: "/wallet",    label: "Carteira", icon: Wallet },
  { to: "/profile",   label: "Perfil", icon: User },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden lg:flex w-[232px] shrink-0 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur">
      <Link to="/" className="flex items-center gap-2 px-5 py-5">
        <Logo />
        <span className="font-semibold tracking-tight">ViaX</span>
        <span className="ml-auto rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary">Beta</span>
      </Link>
      <div className="px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">Terminal</div>
      <nav className="flex-1 px-2 space-y-1">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_oklch(0.70_0.20_250/0.25)]"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary shadow-[var(--shadow-glow-primary)]" />}
              <Icon className={cn("size-4", active && "text-primary")} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 px-3 py-3">
        <Link to="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
          <Settings className="size-4" /> Configurações
        </Link>
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="text-[10px] uppercase tracking-wider text-primary/80">UrbanMind AI</div>
          <div className="mt-1 text-xs text-muted-foreground">Confiança média 24h</div>
          <div className="mt-0.5 mono text-lg text-foreground">78.4%</div>
        </div>
      </div>
    </aside>
  );
}

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="vxg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.18 240)" />
          <stop offset="100%" stopColor="oklch(0.70 0.20 290)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#vxg)" opacity="0.15" />
      <path d="M6 8 L13 24 L16 16 L19 24 L26 8" stroke="url(#vxg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
