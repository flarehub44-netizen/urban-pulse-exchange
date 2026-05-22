import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/loose";

export type SpinResult = {
  already_spun?: boolean;
  outcome_key?: string;
  balance?: number;
  xp?: number;
  is_near_miss?: boolean;
  label?: string;
};

export const casinoDailySpinFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data, error } = await supabase.rpc("casino_daily_spin");
    if (error) throw new Error(error.message);
    return data as SpinResult;
  });

export const casinoQuickDepositFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number; context?: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data: res, error } = await supabase.rpc("casino_quick_deposit", {
      p_amount: data.amount,
      p_context: data.context ?? "low_balance",
    });
    if (error) throw new Error(error.message);
    return res as { balance: number; tx_id?: string; bonus_spin?: SpinResult };
  });

export const setCasinoOptOutFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { optOut: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context as SupabaseFnContext;
    const { data: res, error } = await supabase.rpc("set_casino_opt_out", {
      p_opt_out: data.optOut,
    });
    if (error) throw new Error(error.message);
    return res as { opt_out: boolean };
  });
