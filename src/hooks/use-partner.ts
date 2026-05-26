import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountContext } from "@/hooks/use-account-context";

export function useMyPartnerStatus(enabled = true) {
  const ctx = useAccountContext(enabled);
  return {
    ...ctx,
    data: ctx.data
      ? {
          role: ctx.data.partner.role === "none" ? undefined : ctx.data.partner.role,
          status: ctx.data.partner.status,
          slug: ctx.data.partner.slug,
          tier: ctx.data.partner.tier,
          verified: ctx.data.partner.verified,
          balance: ctx.data.partner.balance,
        }
      : undefined,
  };
}

export function usePartnerOverview(enabled = true) {
  return useQuery({
    queryKey: ["partner", "overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_overview");
      if (error) throw error;
      return data as {
        balance: number;
        tier: string;
        slug: string;
        referrals: number;
        volume: number;
        revenue: number;
        clicks: number;
        conversions: number;
        conversion_rate: number;
        revenue_share_pct: number;
        cpa_amount: number;
        cpa_uses_custom: boolean;
        cpa_min_deposit_threshold: number;
      };
    },
    enabled,
    staleTime: 20_000,
  });
}

export function usePartnerRevenueSeries(days = 30, enabled = true) {
  return useQuery({
    queryKey: ["partner", "revenue-series", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_revenue_series", {
        p_days: days,
      });
      if (error) throw error;
      return (data ?? []) as { day: string; amount: number }[];
    },
    enabled,
  });
}

export function usePartnerEvents(enabled = true) {
  return useQuery({
    queryKey: ["partner", "events"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_events_feed", { p_limit: 25 });
      if (error) throw error;
      return (data ?? []) as { kind: string; message: string; at: string }[];
    },
    enabled,
    refetchInterval: 45_000,
  });
}

export function usePartnerInvites(enabled = true) {
  return useQuery({
    queryKey: ["partner", "invites"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_invites_list");
      if (error) throw error;
      return (data ?? []) as {
        user_id: string;
        handle: string;
        city: string;
        first_deposit: boolean;
        first_bet: boolean;
        joined_at: string;
      }[];
    },
    enabled,
  });
}

export function usePartnerCampaigns(enabled = true) {
  return useQuery({
    queryKey: ["partner", "campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_campaigns");
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        name: string;
        slug_suffix: string | null;
        target: Record<string, string>;
        clicks: number;
        conversions: number;
        created_at: string;
      }[];
    },
    enabled,
  });
}

export function usePartnerLeaderboard(enabled = true) {
  return useQuery({
    queryKey: ["partner", "leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_leaderboard", {
        p_metric: "volume",
      });
      if (error) throw error;
      return (data ?? []) as {
        partner_id: string;
        slug: string;
        tier: string;
        name: string;
        handle: string;
        score: number;
      }[];
    },
    enabled,
  });
}

export function usePartnerAnalytics(enabled = true) {
  return useQuery({
    queryKey: ["partner", "analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_analytics");
      if (error) throw error;
      return data as {
        active_bets_24h: number;
        new_referrals_7d: number;
        total_referrals: number;
        volume_by_city: { city: string; volume: number }[];
      };
    },
    enabled,
  });
}

export function usePartnerSubAffiliates(enabled = true) {
  return useQuery({
    queryKey: ["partner", "subs"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_sub_affiliates");
      if (error) throw error;
      return data as {
        invite_code: string;
        subs: { user_id: string; slug: string; tier: string; balance: number }[];
      };
    },
    enabled,
  });
}

export function usePartnerPayouts(enabled = true) {
  return useQuery({
    queryKey: ["partner", "payouts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_payouts");
      if (error) throw error;
      return (data ?? []) as { id: string; amount: number; method: string; at: string }[];
    },
    enabled,
  });
}

export function useApplyPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bio: string; focusCity?: string }) => {
      const { data, error } = await supabase.rpc("apply_partner_program", {
        p_bio: input.bio,
        p_focus_city: input.focusCity ?? undefined,
        p_social: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner"] }),
  });
}

export function useCreatePartnerCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      slugSuffix?: string;
      target?: Record<string, string>;
    }) => {
      const { data, error } = await supabase.rpc("create_partner_campaign", {
        p_name: input.name,
        p_slug_suffix: input.slugSuffix ?? undefined,
        p_target: input.target ?? { path: "/dashboard" },
      });
      if (error) throw error;
      return data as { id: string; link_path: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner", "campaigns"] }),
  });
}

export function usePartnerPayoutRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const { data, error } = await supabase.rpc("partner_request_payout", {
        p_amount: amount,
      });
      if (error) throw error;
      return data as { ok: boolean; balance: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner"] });
    },
  });
}

export function usePublicExpertProfile(userId: string | null) {
  return useQuery({
    queryKey: ["expert", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_expert_profile", {
        p_user_id: userId!,
      });
      if (error) throw error;
      return data as {
        is_partner: boolean;
        partner_slug?: string;
        partner_verified?: boolean;
        top_regions: { region: string; bets: number }[];
      };
    },
    enabled: !!userId,
  });
}
