import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminDeleteDailyPollFn,
  adminDeletePartnerEventFn,
  adminDeletePlatformEventFn,
  adminGetEventsHubOverviewFn,
  adminListDailyPollsFn,
  adminListPartnerEventsFn,
  adminListPlatformEventsFn,
  adminUpsertDailyPollFn,
  adminUpsertPlatformEventFn,
} from "@/actions/admin/events";

export type AdminEventsOverview = {
  platform_events: { active: number; upcoming: number; ended: number };
  daily_polls: { has_today: boolean; total: number };
  partner_events: { last_24h: number };
  markets: { live: number; dispute: number; draft: number };
  football: { pending_fixtures: number };
  community: { pending_reports: number };
};

export type AdminPlatformEvent = {
  id: string;
  name: string;
  slug: string;
  description: string;
  starts_at: string;
  ends_at: string;
  badge_icon: string;
  xp_boost: number;
  created_at: string;
};

export type AdminDailyPoll = {
  id: string;
  question: string;
  poll_date: string;
  yes_count: number;
  no_count: number;
  created_at: string;
};

export type AdminPartnerEventRow = {
  id: number;
  partner_id: string;
  partner_handle: string;
  partner_slug: string;
  kind: string;
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export function useAdminEventsOverview(enabled = true) {
  return useQuery({
    queryKey: ["admin", "events-overview"],
    queryFn: () => adminGetEventsHubOverviewFn() as Promise<AdminEventsOverview>,
    enabled,
  });
}

export function useAdminPlatformEvents(enabled = true) {
  return useQuery({
    queryKey: ["admin", "platform-events"],
    queryFn: () => adminListPlatformEventsFn() as Promise<AdminPlatformEvent[]>,
    enabled,
  });
}

export function useAdminUpsertPlatformEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id?: string | null;
      name: string;
      slug: string;
      description: string;
      startsAt: string;
      endsAt: string;
      badgeIcon: string;
      xpBoost: number;
    }) => adminUpsertPlatformEventFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "platform-events"] });
      qc.invalidateQueries({ queryKey: ["admin", "events-overview"] });
      qc.invalidateQueries({ queryKey: ["active-events"] });
    },
  });
}

export function useAdminDeletePlatformEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDeletePlatformEventFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "platform-events"] });
      qc.invalidateQueries({ queryKey: ["admin", "events-overview"] });
      qc.invalidateQueries({ queryKey: ["active-events"] });
    },
  });
}

export function useAdminDailyPolls(enabled = true) {
  return useQuery({
    queryKey: ["admin", "daily-polls"],
    queryFn: () => adminListDailyPollsFn() as Promise<AdminDailyPoll[]>,
    enabled,
  });
}

export function useAdminUpsertDailyPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string | null; question: string; pollDate: string }) =>
      adminUpsertDailyPollFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "daily-polls"] });
      qc.invalidateQueries({ queryKey: ["admin", "events-overview"] });
    },
  });
}

export function useAdminDeleteDailyPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDeleteDailyPollFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "daily-polls"] });
      qc.invalidateQueries({ queryKey: ["admin", "events-overview"] });
    },
  });
}

export function useAdminPartnerEventsFeed(partnerId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["admin", "partner-events", partnerId ?? "all"],
    queryFn: () =>
      adminListPartnerEventsFn({
        data: { partnerId: partnerId ?? undefined },
      }) as Promise<AdminPartnerEventRow[]>,
    enabled,
  });
}

export function useAdminDeletePartnerEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminDeletePartnerEventFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "partner-events"] });
      qc.invalidateQueries({ queryKey: ["admin", "events-overview"] });
    },
  });
}

export function platformEventStatus(
  startsAt: string,
  endsAt: string,
): "active" | "upcoming" | "ended" {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
}
