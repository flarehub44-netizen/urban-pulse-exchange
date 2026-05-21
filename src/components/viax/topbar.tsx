import { Bell, Flame, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { useViaX } from "@/store/viax-store";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { useNotifications } from "@/hooks/use-notifications";
import { markNotificationsReadFn } from "@/actions/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { formatBRL } from "@/lib/parimutuel";
import { AnimatedNumber } from "./animated-number";
import { DivisionBadge } from "./division-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Topbar() {
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const zustandMe = useViaX((s) => s.me);
  const me = profile ?? zustandMe;

  const { data: dbNotifications } = useNotifications();
  const zustandNotifications = useViaX((s) => s.notifications);
  const notifications = dbNotifications ?? zustandNotifications;

  const queryClient = useQueryClient();
  const xpPct = (me.xp / (("xpToNext" in me ? me.xpToNext : 2000))) * 100;
  const unread = notifications.filter((n) => !n.read).length;

  const handleBellOpen = async () => {
    if (unread > 0) {
      try {
        await markNotificationsReadFn({ data: undefined });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        // silent — not critical
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur lg:px-6">
      <div className="hidden lg:flex items-center gap-2 text-xs">
        <span className="size-2 rounded-full bg-up animate-[pulse-glow_2s_ease-in-out_infinite]" />
        <span className="text-muted-foreground">Mercados ao vivo</span>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <Stat icon={<WalletIcon className="size-3.5" />} label="Saldo">
          <AnimatedNumber value={me.balance} format={formatBRL} className="text-foreground" />
        </Stat>
        <Stat icon={<TrendingUp className="size-3.5" />} label="Volume 24h" hideSm>
          <AnimatedNumber value={"volume24h" in me ? me.volume24h : 0} format={formatBRL} className="text-foreground" />
        </Stat>
        <div className="hidden md:flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${xpPct}%` }} />
          </div>
          <span className="mono text-xs text-foreground">{me.xp}</span>
        </div>
        <DivisionBadge division={me.division} className="hidden sm:inline-flex" />
        <div className="hidden md:flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs">
          <Flame className="size-3.5 text-warn" />
          <span className="mono">{me.streak}</span>
        </div>

        <Popover onOpenChange={(open) => { if (open) handleBellOpen(); }}>
          <PopoverTrigger asChild>
            <button className="relative flex size-9 items-center justify-center rounded-full border bg-card hover:bg-surface-2">
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary shadow-[var(--shadow-glow-primary)]" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-3 py-2 text-sm font-medium">Notificações</div>
            <ul className="max-h-80 overflow-auto">
              {notifications.length === 0 && (
                <li className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhuma notificação</li>
              )}
              {notifications.map((n) => (
                <li key={n.id} className="border-b px-3 py-2 text-sm last:border-0 hover:bg-surface/60">
                  <div className="text-foreground/90">{n.text}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(n.time, { locale: ptBR, addSuffix: true })}
                  </div>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        <img src={me.avatar} alt={me.name} className="size-9 rounded-full border bg-card" />
      </div>
    </header>
  );
}

function Stat({ icon, label, children, hideSm }: { icon: React.ReactNode; label: string; children: React.ReactNode; hideSm?: boolean }) {
  return (
    <div className={`items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs ${hideSm ? "hidden md:flex" : "hidden sm:flex"}`}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="ml-1">{children}</span>
    </div>
  );
}
