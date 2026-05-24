import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Flame,
  TrendingUp,
  Wallet as WalletIcon,
  Briefcase,
  Search,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAccountContext } from "@/hooks/use-account-context";
import { AccountRoleBadges } from "@/components/auth/account-role-badges";
import { useResolvedProfile, useResolvedNotifications } from "@/hooks/use-resolved-data";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { useBets } from "@/hooks/use-bets";
import { isOpenBetStatus } from "@/lib/market-status";
import { markNotificationsReadFn } from "@/actions/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { formatBRL } from "@/lib/parimutuel";
import { copy } from "@/copy/pt-BR";
import { getNotificationLink } from "@/lib/notification-routes";
import { AnimatedNumber } from "./animated-number";
import { DivisionBadge } from "./division-badge";
import { MobileSidebarDrawer } from "./sidebar";
import { openCommandPalette } from "./command-palette";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Topbar() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { me } = useResolvedProfile();
  const { data: profile } = useProfile(userId);
  const { data: accountCtx } = useAccountContext(!!userId);
  const isActivePartner =
    accountCtx?.partner?.role === "partner" && accountCtx.partner.status === "active";
  const { notifications } = useResolvedNotifications();

  const { data: bets } = useBets();
  const openPositions = (bets ?? []).filter((b) => isOpenBetStatus(b.marketStatus)).length;

  const queryClient = useQueryClient();
  const xpPct = (me.xp / ("xpToNext" in me ? me.xpToNext : 2000)) * 100;
  const unread = notifications.filter((n) => !n.read).length;

  const handleBellOpen = async () => {
    if (unread > 0) {
      try {
        await markNotificationsReadFn({ data: undefined });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        /* silent */
      }
    }
  };

  const goNotification = (n: (typeof notifications)[0]) => {
    const link = getNotificationLink(n);
    if (!link) return;
    if (link.to === "/markets/$marketId") {
      navigate({ to: link.to, params: link.params });
    } else if ("search" in link && link.search) {
      navigate({ to: link.to, search: link.search });
    } else {
      navigate({ to: link.to });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur lg:px-6">
      <MobileSidebarDrawer />
      <div className="hidden lg:flex items-center gap-2 text-xs">
        <span className="size-2 rounded-full bg-up animate-[pulse-glow_2s_ease-in-out_infinite]" />
        <span className="text-muted-foreground">Mercados ao vivo</span>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-4">
        {profile?.isAdmin && (
          <Link
            to="/admin"
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] text-primary hover:bg-primary/20"
            title={copy.admin.title}
          >
            <Shield className="size-3.5" />
            Ops
          </Link>
        )}
        {isActivePartner && (
          <Link
            to="/partner"
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/10 px-2.5 py-1 text-[10px] text-warn hover:bg-warn/20"
            title={copy.partner.portalCta}
          >
            {copy.auth.rolePartner}
          </Link>
        )}
        <button
          type="button"
          onClick={() => openCommandPalette()}
          className="hidden sm:flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          aria-label="Buscar (atalho ⌘K)"
        >
          <Search className="size-3.5" />
          <span className="hidden md:inline">Buscar</span>
          <kbd className="hidden lg:inline rounded border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>
        {openPositions > 0 && (
          <Link
            to="/profile"
            search={{ tab: "posicoes" }}
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/15"
          >
            <Briefcase className="size-3.5" />
            <span className="mono">{openPositions}</span>
            <span className="hidden md:inline">abertas</span>
          </Link>
        )}

        <Link to="/profile" search={{ tab: "carteira" }} className="hidden sm:flex">
          <Stat icon={<WalletIcon className="size-3.5" />} label="Saldo">
            <AnimatedNumber value={me.balance} format={formatBRL} className="text-foreground" />
          </Stat>
        </Link>
        <Stat icon={<TrendingUp className="size-3.5" />} label="Volume 24h" hideSm>
          <AnimatedNumber
            value={"volume24h" in me ? me.volume24h : 0}
            format={formatBRL}
            className="text-foreground"
          />
        </Stat>
        <div className="hidden md:flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">XP</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-glow"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <span className="mono text-xs text-foreground">{me.xp}</span>
        </div>
        <DivisionBadge division={me.division} className="hidden sm:inline-flex" />
        <AccountRoleBadges />
        <div
          className={cn(
            "hidden md:flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs",
            me.streak >= 3 && "border-warn/40 shadow-[var(--shadow-glow-up)]",
          )}
        >
          <Flame
            className={cn(
              "size-3.5 text-warn",
              me.streak >= 3 && "animate-[pulse-glow_2s_ease-in-out_infinite]",
            )}
          />
          <span className="mono">{me.streak}</span>
        </div>

        <Popover
          onOpenChange={(open) => {
            if (open) handleBellOpen();
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative flex size-9 items-center justify-center rounded-full border bg-card hover:bg-surface-2"
              aria-label="Notificações"
            >
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary shadow-[var(--shadow-glow-primary)]" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">Notificações</span>
              <Link to="/notifications" className="text-xs text-primary hover:underline">
                Ver todas
              </Link>
            </div>
            <ul className="max-h-80 overflow-auto">
              {notifications.length === 0 && (
                <li className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Nenhuma notificação
                </li>
              )}
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => goNotification(n)}
                    className="w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-surface/60"
                  >
                    <div className="text-foreground/90">{n.text}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(n.time, { locale: ptBR, addSuffix: true })}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        <Link
          to="/profile"
          className="shrink-0 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <img src={me.avatar} alt={me.name} className="size-9 rounded-full border bg-card" />
        </Link>
      </div>
    </header>
  );
}

function Stat({
  icon,
  label,
  children,
  hideSm,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  hideSm?: boolean;
}) {
  return (
    <div
      className={`items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs transition hover:bg-surface-2 ${hideSm ? "hidden md:flex" : "hidden sm:flex"}`}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="ml-1">{children}</span>
    </div>
  );
}
