import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePlatformFlag(key: string, fallback = false) {
  return useQuery({
    queryKey: ["platform-flag", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      if (data?.value == null) return fallback;
      return Boolean(data.value);
    },
    staleTime: 60_000,
  });
}
