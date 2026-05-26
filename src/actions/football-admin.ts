import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/context";
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
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as SupabaseFnContext;
    await assertAdmin(supabase, userId);
    return runFootballSync();
  });

export const adminFootballResolveFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as SupabaseFnContext;
    await assertAdmin(supabase, userId);
    return runFootballResolve();
  });
