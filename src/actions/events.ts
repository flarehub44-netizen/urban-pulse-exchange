import { createServerFn } from "@tanstack/react-start";
import { db } from "@/integrations/supabase/loose";

export type PlatformEvent = {
  id: string;
  name: string;
  slug: string;
  description: string;
  badge_icon: string;
  xp_boost: number;
  ends_at: string;
};

export const getActiveEventsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = (await db
        .from("platform_events")
        .select("id, name, slug, description, badge_icon, xp_boost, ends_at")
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("ends_at", { ascending: true })) as {
        data: PlatformEvent[] | null;
        error: Error | null;
      };

      if (error) {
        console.warn("[events] Failed to load active events:", error.message);
        return [];
      }

      return data ?? [];
    } catch (error) {
      console.warn("[events] Active events unavailable:", error);
      return [];
    }
  });
