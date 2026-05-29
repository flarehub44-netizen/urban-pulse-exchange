import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TrafficEventTemplate = {
  id: string;
  name: string;
  question: string;
  region: string;
  region_id: string | null;
  target: number;
  category: string;
  resolution_metric: string | null;
  comparison_op: string | null;
  data_source: string;
  camera_id: string | null;
  ai_side: string;
  ai_value: number;
  ai_confidence: number;
  active: boolean;
  ready: boolean;
  weight: number;
  last_tested_at: string | null;
  last_used_at: string | null;
  last_spawned_market_id: string | null;
};

export type TrafficScheduler = {
  id: number;
  event_duration: string;
  gap_after_end: string;
  next_starts_at: string | null;
  last_ended_at: string | null;
  current_market_id: string | null;
  last_template_id: string | null;
};

export type TrafficTemplateCamera = {
  id: string;
  name: string;
  region_id: string | null;
  status: string;
  stream_url: string | null;
  detection_ok: boolean;
};

const TEMPLATES_KEY = ["admin", "traffic-templates"] as const;
const SCHEDULER_KEY = ["admin", "traffic-scheduler"] as const;

export function useAdminTrafficTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_traffic_templates");
      if (error) throw error;
      return (data ?? []) as TrafficEventTemplate[];
    },
    refetchInterval: 20_000,
  });
}

export function useAdminTrafficScheduler() {
  return useQuery({
    queryKey: SCHEDULER_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("traffic_scheduler").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as TrafficScheduler | null;
    },
    refetchInterval: 15_000,
  });
}

export function useAdminUpsertTrafficTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc("admin_upsert_traffic_template", {
        p_payload: payload as unknown as Json,
      });
      if (error) throw error;
      return data as { ok: boolean; id: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useAdminTestTrafficTemplate() {
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await supabase.rpc("admin_test_traffic_template", {
        p_template_id: templateId,
      });
      if (error) throw error;
      return data as {
        template_id: string;
        region_id: string | null;
        camera_id: string | null;
        cameras: TrafficTemplateCamera[];
      };
    },
  });
}

export function useAdminSetTrafficTemplateReady() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ready }: { id: string; ready: boolean }) => {
      const { data, error } = await supabase.rpc("admin_set_traffic_template_ready", {
        p_template_id: id,
        p_ready: ready,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useAdminUpdateTrafficScheduler() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc("admin_update_traffic_scheduler", {
        p_payload: payload as unknown as Json,
      });
      if (error) throw error;
      return data as TrafficScheduler;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SCHEDULER_KEY });
      void qc.invalidateQueries({ queryKey: ["traffic-public-state"] });
    },
  });
}

export function useAdminDeleteTrafficTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await supabase.rpc("admin_delete_traffic_template", {
        p_template_id: templateId,
      });
      if (error) throw error;
      return data as { ok: boolean; deleted_id: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      void qc.invalidateQueries({ queryKey: ["traffic-public-state"] });
    },
  });
}
