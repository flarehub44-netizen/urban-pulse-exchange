import { copy } from "@/copy/pt-BR";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radio,
  Scale,
  Brain,
  Video,
  Coins,
  Users,
  ShieldAlert,
  Settings,
  FlaskConical,
  Sparkles,
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
  { to: "/admin/settlement", label: copy.admin.nav.settlement, icon: Scale },
  { to: "/admin/intelligence", label: copy.admin.nav.intelligence, icon: Brain },
  { to: "/admin/sources", label: copy.admin.nav.sources, icon: Video },
  { to: "/admin/finance", label: copy.admin.nav.finance, icon: Coins },
  { to: "/admin/users", label: copy.admin.nav.users, icon: Users },
  { to: "/admin/partners", label: copy.admin.nav.partners, icon: Sparkles },
  { to: "/admin/risk", label: copy.admin.nav.risk, icon: ShieldAlert },
  { to: "/admin/system", label: copy.admin.nav.system, icon: Settings },
  { to: "/admin/simulator", label: copy.admin.nav.simulator, icon: FlaskConical },
];

export function isAdminNavActive(path: string, item: AdminNavItem): boolean {
  if (item.to === "/admin") return path === "/admin" || path === "/admin/";
  return path === item.to || path.startsWith(item.to + "/");
}
