import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_events_hub_overview");
      if (error) throw error;
      return data as AdminEventsOverview;
    },
    enabled,
  });
}

export function useAdminPlatformEvents(enabled = true) {
  return useQuery({
    queryKey: ["admin", "platform-events"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_platform_events");
      if (error) throw error;
      return (data ?? []) as AdminPlatformEvent[];
    },
    enabled,
  });
}

export function useAdminUpsertPlatformEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string | null;
      name: string;
      slug: string;
      description: string;
      startsAt: string;
      endsAt: string;
      badgeIcon: string;
      xpBoost: number;
    }) => {
      const { data, error } = await supabase.rpc("admin_upsert_platform_event", {
        p_id: input.id ?? undefined,
        p_name: input.name,
        p_slug: input.slug,
        p_description: input.description,
        p_starts_at: input.startsAt,
        p_ends_at: input.endsAt,
        p_badge_icon: input.badgeIcon,
        p_xp_boost: input.xpBoost,
      });
      if (error) throw error;
      return data;
    },
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
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("admin_delete_platform_event", {
        p_id: id,
      });
      if (error) throw error;
      return data;
    },
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
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_daily_polls", { p_limit: 30 });
      if (error) throw error;
      return (data ?? []) as AdminDailyPoll[];
    },
    enabled,
  });
}

export function useAdminUpsertDailyPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string | null; question: string; pollDate: string }) => {
      const { data, error } = await supabase.rpc("admin_upsert_daily_poll", {
        p_id: input.id ?? undefined,
        p_question: input.question,
        p_poll_date: input.pollDate,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "daily-polls"] });
      qc.invalidateQueries({ queryKey: ["admin", "events-overview"] });
    },
  });
}

export function useAdminDeleteDailyPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("admin_delete_daily_poll", { p_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "daily-polls"] });
      qc.invalidateQueries({ queryKey: ["admin", "events-overview"] });
    },
  });
}

export function useAdminPartnerEventsFeed(partnerId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["admin", "partner-events", partnerId ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_partner_events", {
        p_limit: 50,
        p_partner_id: null,
        p_partner_query: partnerId ?? undefined,
      });
      if (error) throw error;
      return (data ?? []) as AdminPartnerEventRow[];
    },
    enabled,
  });
}

export function useAdminDeletePartnerEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await supabase.rpc("admin_delete_partner_event", { p_id: id });
      if (error) throw error;
      return data;
    },
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
