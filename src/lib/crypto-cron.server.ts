import { getServiceClient } from "@/lib/supabase-service.server";

export async function runCryptoSlotOpen(intervalMinutes = 15) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("cron_open_crypto_slot", {
    p_interval_minutes: intervalMinutes,
  });
  if (error) throw error;
  return data;
}
