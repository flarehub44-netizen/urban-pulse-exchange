import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type NotificationPrefs = {
  wins: boolean;
  markets: boolean;
  ranking: boolean;
  alerts: boolean;
  pushDigest: boolean;
};

const STORAGE_KEY = "viax_notification_prefs";
const defaults: NotificationPrefs = {
  wins: true,
  markets: true,
  ranking: false,
  alerts: true,
  pushDigest: false,
};

function loadLocal(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaults;
}

export function useNotificationPrefs() {
  const { userId } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadLocal);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("notification_prefs")
        .eq("id", userId)
        .single();
      if (data?.notification_prefs) {
        const merged = { ...defaults, ...data.notification_prefs };
        setPrefs(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    })();
  }, [userId]);

  const update = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      const next = { ...prefs, ...patch };
      setPrefs(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (userId) {
        await supabase.from("profiles").update({ notification_prefs: next }).eq("id", userId);
      }
    },
    [prefs, userId],
  );

  return { prefs, update };
}
