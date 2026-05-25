import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const envEnabled =
  typeof import.meta.env.VITE_CASINO_ENABLED === "string"
    ? import.meta.env.VITE_CASINO_ENABLED !== "false"
    : true;

export function useCasinoEnabled() {
  const { userId } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["casino", "status", userId],
    queryFn: async () => {
      const { data: res, error } = await supabase.rpc("casino_spin_status");
      if (error) throw error;
      return res as {
        enabled?: boolean;
        daily_available?: boolean;
        deposit_bonus_available?: boolean;
        opt_out?: boolean;
      };
    },
    enabled: !!userId && envEnabled,
    staleTime: 60_000,
  });

  const enabled = envEnabled && !!data?.enabled && !data?.opt_out;

  return {
    enabled,
    isLoading: !!userId && isLoading,
    status: data,
    optOut: !!data?.opt_out,
  };
}
