import { useEffect, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { useNavigate } from "@tanstack/react-router";

import { copy } from "@/copy/pt-BR";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

/** Attempts to resolve expired markets once per session (demo oracle = UrbanMind side). */

export function useResolveExpired() {
  const queryClient = useQueryClient();

  const navigate = useNavigate();

  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;

    ran.current = true;

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.rpc("resolve_expired_markets");

        if (error || cancelled) return;

        const count = typeof data === "number" ? data : 0;

        if (count > 0) {
          toast.success(`${count} mercado(s) resolvido(s)`, {
            description: copy.notifications.resolveDesc,

            action: {
              label: "Ver carteira",

              onClick: () => navigate({ to: "/profile", search: { tab: "carteira" } }),
            },
          });
        }

        queryClient.invalidateQueries({ queryKey: ["markets"] });

        queryClient.invalidateQueries({ queryKey: ["bets"] });

        queryClient.invalidateQueries({ queryKey: ["transactions"] });

        queryClient.invalidateQueries({ queryKey: ["me"] });

        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        /* offline or migration not applied */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClient, navigate]);
}
