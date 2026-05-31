import { copy } from "@/copy/pt-BR";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radio,
  Scale,
  Brain,
  Video,
  Coins,
  Gift,
  Users,
  ShieldAlert,
  Settings,
  FlaskConical,
  Sparkles,
  Flag,
  Calendar,
  UsersRound,
  TrafficCone,
  ScrollText,
} from "lucide-react";

export type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export const adminNav: AdminNavItem[] = [
  { to: "/admin", label: copy.admin.nav.overview, icon: LayoutDashboard },
  { to: "/admin/markets", label: copy.admin.nav.markets, icon: Radio },
  { to: "/admin/community", label: copy.admin.nav.community, icon: UsersRound },
  { to: "/admin/football", label: copy.admin.nav.football, icon: Flag },
  {
    to: "/admin/traffic-events",
    label: copy.admin.nav.trafficEvents,
    icon: TrafficCone,
  },
  { to: "/admin/settlement", label: copy.admin.nav.settlement, icon: Scale },
  { to: "/admin/intelligence", label: copy.admin.nav.intelligence, icon: Brain },
  { to: "/admin/sources", label: copy.admin.nav.sources, icon: Video },
  { to: "/admin/finance", label: copy.admin.nav.finance, icon: Coins },
  { to: "/admin/bonuses", label: copy.admin.nav.bonuses, icon: Gift },
  { to: "/admin/users", label: copy.admin.nav.users, icon: Users },
  { to: "/admin/partners", label: copy.admin.nav.partners, icon: Sparkles },
  { to: "/admin/events", label: copy.admin.nav.events, icon: Calendar },
  { to: "/admin/risk", label: copy.admin.nav.risk, icon: ShieldAlert },
  { to: "/admin/system", label: copy.admin.nav.system, icon: Settings },
  { to: "/admin/logs", label: "Logs", icon: ScrollText },
  { to: "/admin/simulator", label: copy.admin.nav.simulator, icon: FlaskConical },
];

export function isAdminNavActive(path: string, item: AdminNavItem): boolean {
  if (item.to === "/admin") return path === "/admin" || path === "/admin/";
  return path === item.to || path.startsWith(item.to + "/");
}
