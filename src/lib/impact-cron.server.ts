import { getServiceClient } from "@/lib/supabase-service.server";

export async function runImpactXpCredit(limit = 50) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("service_credit_pending_event_impact_xp", {
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return data as { processed?: number; skipped?: number };
}

export async function runImpactMonthlyFinalize(month?: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("service_finalize_monthly_impact", {
    p_month: month ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as {
    ok?: boolean;
    period_month?: string;
    winners_inserted?: number;
    already_finalized?: boolean;
  };
}
