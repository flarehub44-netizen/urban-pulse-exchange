import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export type PlatformEvent = {
  id: string;
  name: string;
  slug: string;
  description: string;
  badge_icon: string;
  xp_boost: number;
  ends_at: string;
};

function parseActiveEventsPayload(data: unknown): PlatformEvent[] {
  if (!data) return [];
  const rows = Array.isArray(data) ? data : typeof data === "string" ? JSON.parse(data) : [];
  if (!Array.isArray(rows)) return [];
  return rows as PlatformEvent[];
}

/**
 * @public Intentionally unauthenticated — returns read-only active platform events.
 * Rate-limited via assertRateLimit at the BFF layer.
 */
export const getActiveEventsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase.rpc("get_active_events");
  if (error) {
    throw new Error(error.message);
  }
  return parseActiveEventsPayload(data);
});
