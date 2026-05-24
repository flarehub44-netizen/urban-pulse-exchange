import { copy } from "@/copy/pt-BR";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radio,
  Map,
  Trophy,
  MessageSquare,
  Brain,
  Wallet,
  User,
  Settings,
  Briefcase,
  Bell,
  Shield,
  Flag,
} from "lucide-react";

export type NavSearch = Record<string, string>;

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match child paths (e.g. /markets/xxx) */
  matchPrefix?: boolean;
  /** TanStack Router search params (e.g. profile tab) */
  search?: NavSearch;
};

/** Full sidebar navigation */
export const sidebarNav: NavItem[] = [
  { to: "/dashboard", label: copy.nav.home, icon: LayoutDashboard },
  { to: "/markets", label: copy.nav.markets, icon: Radio, matchPrefix: true },
  { to: "/football", label: copy.nav.football, icon: Flag, matchPrefix: true },
  { to: "/live", label: copy.nav.live, icon: Map },
  { to: "/ranking", label: copy.nav.ranking, icon: Trophy },
  { to: "/feed", label: copy.nav.feed, icon: MessageSquare },
  { to: "/urbanmind", label: copy.nav.urbanmind, icon: Brain },
  { to: "/leagues", label: "Ligas", icon: Shield },
  { to: "/profile", label: copy.nav.account, icon: User, matchPrefix: true },
];

export const settingsNav: NavItem = {
  to: "/settings",
  label: copy.nav.settings,
  icon: Settings,
};

export const notificationsNav: NavItem = {
  to: "/notifications",
  label: copy.nav.notifications,
  icon: Bell,
};

/** Mobile bottom bar — Início · Mercados · Ao vivo · Previsões · Conta */
export const bottomNavPrimary: NavItem[] = [
  { to: "/dashboard", label: copy.nav.home, icon: LayoutDashboard },
  { to: "/markets", label: copy.nav.markets, icon: Radio, matchPrefix: true },
  { to: "/live", label: copy.nav.live, icon: Map },
  { to: "/profile", label: copy.nav.positions, icon: Briefcase, search: { tab: "posicoes" } },
  { to: "/profile", label: copy.nav.account, icon: User, matchPrefix: true },
];

/** Secondary routes in mobile "Mais" sheet */
export const bottomNavMore: NavItem[] = [
  { to: "/football", label: copy.nav.football, icon: Flag, matchPrefix: true },
  { to: "/ranking", label: copy.nav.ranking, icon: Trophy },
  { to: "/feed", label: copy.nav.feed, icon: MessageSquare },
  { to: "/notifications", label: copy.nav.notifications, icon: Bell },
  { to: "/profile", label: copy.nav.wallet, icon: Wallet, search: { tab: "carteira" } },
  { to: "/urbanmind", label: copy.nav.urbanmind, icon: Brain },
];

const LAST_MORE_KEY = "viax_last_more_nav";

export type LastMoreNav = { to: string; search?: NavSearch };

export function getLastMoreNav(): LastMoreNav | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LAST_MORE_KEY);
  if (!raw) return null;
  try {
    if (raw.startsWith("{")) return JSON.parse(raw) as LastMoreNav;
    return { to: raw };
  } catch {
    return { to: raw };
  }
}

export function setLastMoreNav(entry: LastMoreNav) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_MORE_KEY, JSON.stringify(entry));
}

export function isNavActive(
  path: string,
  item: NavItem,
  search?: Record<string, unknown>,
): boolean {
  if (item.search?.tab) {
    if (path !== item.to) return false;
    return search?.tab === item.search.tab;
  }
  if (path === item.to) {
    if (item.to === "/profile" && !item.matchPrefix) return false;
    if (item.to === "/profile" && item.matchPrefix) {
      const tab = search?.tab;
      return tab === undefined || tab === "visao";
    }
    return true;
  }
  if (!item.matchPrefix) return false;
  if (item.to === "/dashboard") return false;
  return path.startsWith(item.to + "/") || path.startsWith(item.to);
}

export function isAnyNavActive(path: string, items: NavItem[]): boolean {
  return items.some((it) => isNavActive(path, it));
}
