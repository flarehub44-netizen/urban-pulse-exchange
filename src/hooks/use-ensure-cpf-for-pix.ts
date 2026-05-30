import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { hasValidProfileCpf } from "@/lib/cpf";

export function useEnsureCpfForPix() {
  const { userId, isRegistered } = useAuth();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const cpfQuery = useQuery({
    queryKey: ["profile-cpf", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("cpf")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return (data?.cpf as string | null) ?? null;
    },
    enabled: !!userId && isRegistered,
    staleTime: 30_000,
  });

  const hasCpf = hasValidProfileCpf(cpfQuery.data);

  const ensureCpf = useCallback(
    async (action: () => void) => {
      // Fast path: cached profile already has a valid CPF.
      if (hasCpf) {
        action();
        return;
      }
      // Re-check against the DB before prompting — avoids asking for CPF
      // when the local cache is stale (e.g., right after signup or after
      // the user filled CPF in another tab/device).
      if (!userId) {
        pendingActionRef.current = action;
        setSheetOpen(true);
        return;
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("cpf")
          .eq("id", userId)
          .single();
        const fresh = (data?.cpf as string | null) ?? null;
        queryClient.setQueryData(["profile-cpf", userId], fresh);
        if (hasValidProfileCpf(fresh)) {
          action();
          return;
        }
      } catch {
        // fall through to the capture sheet
      }
      pendingActionRef.current = action;
      setSheetOpen(true);
    },
    [hasCpf, userId, queryClient],
  );

  const onCpfSaved = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["profile-cpf", userId] });
    void queryClient.invalidateQueries({ queryKey: ["me"] });
    setSheetOpen(false);
    const next = pendingActionRef.current;
    pendingActionRef.current = null;
    next?.();
  }, [queryClient, userId]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    pendingActionRef.current = null;
  }, []);

  return {
    hasCpf,
    cpfLoading: cpfQuery.isLoading,
    cpfQuery,
    sheetOpen,
    setSheetOpen,
    ensureCpf,
    onCpfSaved,
    closeSheet,
  };
}
