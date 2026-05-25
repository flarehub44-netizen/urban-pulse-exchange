import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  bottomNavPrimary,
  bottomNavMore,
  isNavActive,
  isAnyNavActive,
  getLastMoreNav,
  setLastMoreNav,
  type LastMoreNav,
  type NavItem,
} from "@/config/navigation";
import { useNavBadges } from "@/hooks/use-nav-badges";

function NavCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [lastMore, setLastMore] = useState<LastMoreNav | null>(null);
  const { openPositions, unreadNotifications } = useNavBadges();

  useEffect(() => {
    setLastMore(getLastMoreNav());
  }, [path]);

  const lastMoreItem = useMemo(() => {
    if (!lastMore) return null;
    return (
      bottomNavMore.find(
        (it) => it.to === lastMore.to && (it.search?.tab ?? "") === (lastMore.search?.tab ?? ""),
      ) ??
      bottomNavMore.find((it) => it.to === lastMore.to) ??
      null
    );
  }, [lastMore]);

  const moreActive =
    isAnyNavActive(path, bottomNavMore) || path === "/settings" || path === "/notifications";

  const visitMore = (it: NavItem) => {
    let navSearch = it.search as Record<string, string> | undefined;
    if (
      it.to === "/profile" &&
      it.search?.tab === "carteira" &&
      typeof window !== "undefined" &&
      !localStorage.getItem("viax_wallet_deposit_intro")
    ) {
      localStorage.setItem("viax_wallet_deposit_intro", "1");
      navSearch = { ...navSearch, tab: "carteira", deposit: "1" };
    }
    const entry: LastMoreNav = { to: it.to, search: it.search };
    setLastMoreNav(entry);
    setLastMore(entry);
    navigate({ to: it.to, search: navSearch });
    setOpen(false);
  };

  return (
    <>
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      {open && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 rounded-t-2xl border-t border-border/60 bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <span className="text-sm font-medium">Mais</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 hover:bg-surface-2"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>
          <ul className="grid grid-cols-4 p-3 gap-1 sm:grid-cols-5">
            {bottomNavMore.map((it) => {
              const Icon = it.icon;
              const active = isNavActive(path, it, search);
              return (
                <li key={`${it.to}-${it.search?.tab ?? it.label}`}>
                  <button
                    type="button"
                    onClick={() => visitMore(it)}
                    className={cn(
                      "flex w-full flex-col items-center gap-1 rounded-xl py-3 text-[10px] transition",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5",
                        active && "drop-shadow-[0_0_8px_var(--color-primary)]",
                      )}
                    />
                    {it.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação mobile"
      >
        <ul className="grid grid-cols-6">
          {bottomNavPrimary.map((it) => {
            const active = isNavActive(path, it, search);
            const Icon = it.icon;
            return (
              <li key={`${it.to}-${it.search?.tab ?? it.label}`}>
                <Link
                  to={it.to}
                  search={it.search}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-col items-center gap-1 py-2.5 text-[10px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon
                    className={cn("size-5", active && "drop-shadow-[0_0_8px_var(--color-primary)]")}
                  />
                  {it.label}
                  {it.to === "/profile" && it.search?.tab === "posicoes" && (
                    <NavCountBadge count={openPositions} />
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            {lastMoreItem && !open ? (
              <button
                type="button"
                onClick={() => visitMore(lastMoreItem)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setOpen(true);
                }}
                aria-current={isNavActive(path, lastMoreItem, search) ? "page" : undefined}
                className={cn(
                  "relative flex w-full flex-col items-center gap-1 py-2.5 text-[10px]",
                  isNavActive(path, lastMoreItem, search) || moreActive
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                <lastMoreItem.icon
                  className={cn(
                    "size-5",
                    (isNavActive(path, lastMoreItem, search) || moreActive) &&
                      "drop-shadow-[0_0_8px_var(--color-primary)]",
                  )}
                />
                <NavCountBadge count={unreadNotifications} />
                <span className="max-w-[52px] truncate">{lastMoreItem.label}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={open}
                aria-label="Mais opções"
                className={cn(
                  "relative flex w-full flex-col items-center gap-1 py-2.5 text-[10px]",
                  moreActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <MoreHorizontal
                  className={cn(
                    "size-5",
                    moreActive && "drop-shadow-[0_0_8px_var(--color-primary)]",
                  )}
                />
                Mais
                <NavCountBadge count={unreadNotifications} />
              </button>
            )}
          </li>
        </ul>
      </nav>
    </>
  );
}
