import { copy } from "@/copy/pt-BR";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  UserPlus,
  TrendingUp,
  Trophy,
  Link2,
  Palette,
  BarChart3,
  Users,
  Banknote,
} from "lucide-react";

export type PartnerNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const partnerNavAll: PartnerNavItem[] = [
  { to: "/partner", label: copy.partner.nav.overview, icon: LayoutDashboard },
  { to: "/partner/revenue", label: copy.partner.nav.revenue, icon: Wallet },
  { to: "/partner/invites", label: copy.partner.nav.invites, icon: UserPlus },
  { to: "/partner/performance", label: copy.partner.nav.performance, icon: TrendingUp },
  { to: "/partner/leaderboard", label: copy.partner.nav.leaderboard, icon: Trophy },
  { to: "/partner/campaigns", label: copy.partner.nav.campaigns, icon: Link2 },
  { to: "/partner/creatives", label: copy.partner.nav.creatives, icon: Palette },
  { to: "/partner/analytics", label: copy.partner.nav.analytics, icon: BarChart3 },
  { to: "/partner/sub-affiliates", label: copy.partner.nav.subAffiliates, icon: Users },
  { to: "/partner/payouts", label: copy.partner.nav.payouts, icon: Banknote },
];

/** Full nav (legacy); prefer {@link getPartnerNav}. */
export const partnerNav = partnerNavAll;

export function getPartnerNav(subCreatorsEnabled = false): PartnerNavItem[] {
  return partnerNavAll.filter(
    (item) => item.to !== "/partner/sub-affiliates" || subCreatorsEnabled,
  );
}

export function isPartnerNavActive(path: string, item: PartnerNavItem): boolean {
  if (item.to === "/partner") return path === "/partner" || path === "/partner/";
  return path === item.to || path.startsWith(item.to + "/");
}
