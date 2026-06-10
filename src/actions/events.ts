import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { publicRateLimitMiddleware } from "@/lib/public-rate-limit-middleware.server";

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

/** @public Unauthenticated — read-only active platform events. */
export const getActiveEventsFn = createServerFn({ method: "GET" })
  .middleware([publicRateLimitMiddleware("active-events", { max: 120, windowMs: 60_000 })])
  .handler(async () => {
  const { data, error } = await supabase.rpc("get_active_events");
  if (error) {
    throw new Error(error.message);
  }
  return parseActiveEventsPayload(data);
});
