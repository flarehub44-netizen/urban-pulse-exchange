import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminDeleteTrafficTemplateFn,
  adminGetTrafficSchedulerFn,
  adminListTrafficTemplatesFn,
  adminSetTrafficTemplateReadyFn,
  adminTestTrafficTemplateFn,
  adminUpdateTrafficSchedulerFn,
  adminUpsertTrafficTemplateFn,
} from "@/actions/admin/traffic";

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
    queryFn: () => adminListTrafficTemplatesFn() as Promise<TrafficEventTemplate[]>,
    refetchInterval: 20_000,
  });
}

export function useAdminTrafficScheduler() {
  return useQuery({
    queryKey: SCHEDULER_KEY,
    queryFn: () => adminGetTrafficSchedulerFn() as Promise<TrafficScheduler | null>,
    refetchInterval: 15_000,
  });
}

export function useAdminUpsertTrafficTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      adminUpsertTrafficTemplateFn({ data: { payload } }) as Promise<{
        ok: boolean;
        id: string;
      }>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useAdminTestTrafficTemplate() {
  return useMutation({
    mutationFn: (templateId: string) =>
      adminTestTrafficTemplateFn({ data: { templateId } }) as Promise<{
        template_id: string;
        region_id: string | null;
        camera_id: string | null;
        cameras: TrafficTemplateCamera[];
      }>,
  });
}

export function useAdminSetTrafficTemplateReady() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ready }: { id: string; ready: boolean }) =>
      adminSetTrafficTemplateReadyFn({ data: { templateId: id, ready } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useAdminUpdateTrafficScheduler() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      adminUpdateTrafficSchedulerFn({ data: { payload } }) as Promise<TrafficScheduler>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SCHEDULER_KEY });
      void qc.invalidateQueries({ queryKey: ["traffic-public-state"] });
    },
  });
}

export function useAdminDeleteTrafficTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      adminDeleteTrafficTemplateFn({ data: { templateId } }) as Promise<{
        ok: boolean;
        deleted_id: string;
      }>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      void qc.invalidateQueries({ queryKey: ["traffic-public-state"] });
    },
  });
}
