import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseCtx, type SupabaseFnContext } from "@/integrations/supabase/context";
import { runFootballResolve, runFootballSync } from "@/lib/football-cron.server";

async function assertAdmin(supabase: SupabaseFnContext["supabase"], userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile?.is_admin) throw new Error("Admin only");
}

export const adminFootballSyncFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .optional(),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = getSupabaseCtx(context);
    await assertAdmin(supabase, userId);
    return runFootballSync(data?.date);
  });

export const adminFootballResolveFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = getSupabaseCtx(context);
    await assertAdmin(supabase, userId);
    return runFootballResolve();
  });
