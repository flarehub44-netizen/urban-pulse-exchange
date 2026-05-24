import { createMiddleware } from "@tanstack/react-start";
import type { SupabaseFnContext } from "@/integrations/supabase/loose";

/** Exige e-mail confirmado (RPC is_user_registered) após requireSupabaseAuth. */
export const requireRegisteredAuth = createMiddleware({ type: "function" }).server(
  async ({ next, context }) => {
    const { supabase } = context as unknown as SupabaseFnContext;
    const { data, error } = await supabase.rpc("is_user_registered");
    if (error || data !== true) {
      throw new Error("registration_required");
    }
    return next();
  },
);
