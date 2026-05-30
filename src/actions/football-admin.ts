import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAuth } from "@/integrations/supabase/admin-middleware";
import type { Json } from "@/integrations/supabase/types";
import { runFootballResolve, runFootballSync } from "@/lib/football-cron.server";

export const adminFootballSyncFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator(
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    return runFootballSync(data?.date) as Promise<Json>;
  });

export const adminFootballResolveFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    return runFootballResolve() as Promise<Json>;
  });
