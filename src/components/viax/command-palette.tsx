import { useEffect, useState } from "react";

export function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
}
import { useNavigate } from "@tanstack/react-router";
import { useMarkets } from "@/hooks/use-markets";
import { useTraders } from "@/hooks/use-traders";
import { useViaX } from "@/store/viax-store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { copy } from "@/copy/pt-BR";
import { sidebarNav } from "@/config/navigation";
import {
  LayoutDashboard,
  Radio,
  Map,
  Briefcase,
  Trophy,
  MessageSquare,
  Brain,
  Wallet,
  User,
} from "lucide-react";

const navIcons: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/markets": Radio,
  "/live": Map,
  "/ranking": Trophy,
  "/feed": MessageSquare,
  "/urbanmind": Brain,
  "/profile": User,
  posicoes: Briefcase,
  carteira: Wallet,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: dbMarkets } = useMarkets();
  const zustandMarkets = useViaX((s) => s.markets);
  const markets = dbMarkets ?? zustandMarkets;
  const { data: dbTraders } = useTraders();
  const zustandTraders = useViaX((s) => s.traders);
  const traders = dbTraders ?? zustandTraders;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={copy.command.placeholder} />
      <CommandList>
        <CommandEmpty>{copy.command.empty}</CommandEmpty>
        <CommandGroup heading={copy.command.routes}>
          {sidebarNav.map((item) => {
            const iconKey = item.search?.tab ?? item.to;
            const Icon = navIcons[iconKey] ?? LayoutDashboard;
            return (
              <CommandItem
                key={`${item.to}-${item.search?.tab ?? item.label}`}
                value={`${item.label} ${item.to} ${item.search?.tab ?? ""}`}
                onSelect={() => {
                  setOpen(false);
                  navigate({
                    to: item.to,
                    search: item.search as Record<string, string> | undefined,
                  });
                }}
              >
                <Icon className="mr-2 size-4 text-muted-foreground" />
                {item.label}
              </CommandItem>
            );
          })}
          <CommandItem
            value={copy.nav.settings}
            onSelect={() => {
              setOpen(false);
              navigate({ to: "/profile", search: { tab: "config" } });
            }}
          >
            <User className="mr-2 size-4" /> {copy.nav.settings}
          </CommandItem>
          <CommandItem
            value={copy.nav.notifications}
            onSelect={() => {
              setOpen(false);
              navigate({ to: "/notifications" });
            }}
          >
            <MessageSquare className="mr-2 size-4" /> {copy.nav.notifications}
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={copy.command.markets}>
          {markets.slice(0, 12).map((m) => (
            <CommandItem
              key={m.id}
              value={`${m.question} ${m.region} ${m.id}`}
              onSelect={() => {
                setOpen(false);
                navigate({ to: "/markets/$marketId", params: { marketId: m.id } });
              }}
            >
              <Radio className="mr-2 size-4 shrink-0 text-primary" />
              <span className="truncate">{m.question}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Traders">
          {traders.slice(0, 8).map((t) => (
            <CommandItem
              key={t.id}
              value={`${t.name} ${t.handle}`}
              onSelect={() => {
                setOpen(false);
                navigate({ to: "/profile/$userId", params: { userId: t.id } });
              }}
            >
              <img src={t.avatar} alt="" className="mr-2 size-6 rounded-full" />
              {t.name} <span className="text-muted-foreground">@{t.handle}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
