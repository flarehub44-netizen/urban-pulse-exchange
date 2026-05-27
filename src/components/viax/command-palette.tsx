import { useEffect, useState } from "react";

export function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
}
import { useNavigate } from "@tanstack/react-router";
import { useMarketsList } from "@/hooks/use-markets";
import { useMarketSearch } from "@/hooks/use-market-search";
import { useResolvedTraders } from "@/hooks/use-resolved-data";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useAccountContext } from "@/hooks/use-account-context";
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
  Shield,
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
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { data: profile } = useProfile(userId);
  const { data: accountCtx } = useAccountContext(!!userId);
  const isAdmin = profile?.isAdmin || accountCtx?.admin?.is_admin;
  const { markets } = useMarketsList();
  const { traders } = useResolvedTraders();
  const { data: searchResults = [] } = useMarketSearch(query);

  const hasQuery = query.trim().length >= 2;

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
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
    >
      <CommandInput placeholder={copy.command.placeholder} value={query} onValueChange={setQuery} />
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
          {isAdmin && (
            <CommandItem
              value={`${copy.admin.title} admin ops`}
              onSelect={() => {
                setOpen(false);
                navigate({ to: "/admin" });
              }}
            >
              <Shield className="mr-2 size-4 text-primary" /> {copy.admin.title}
            </CommandItem>
          )}
          <CommandItem
            value={copy.nav.settings}
            onSelect={() => {
              setOpen(false);
              navigate({ to: "/settings" });
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
          {(hasQuery ? searchResults : markets.slice(0, 12)).map((m) => (
            <CommandItem
              key={m.id}
              value={`${m.question} ${m.region} ${m.id}`}
              onSelect={() => {
                setOpen(false);
                setQuery("");
                navigate({ to: "/markets/$marketId", params: { marketId: m.id } });
              }}
            >
              <Radio className="mr-2 size-4 shrink-0 text-primary" />
              <span className="truncate">{m.question}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {!hasQuery && (
          <>
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
                  <img src={t.avatar} alt={t.name} className="mr-2 size-6 rounded-full" />
                  {t.name} <span className="text-muted-foreground">@{t.handle}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
