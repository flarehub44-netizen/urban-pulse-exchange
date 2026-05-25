import { useEffect } from "react";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { useTodayCheckIn } from "@/hooks/use-daily-check-in";
import { useAuth } from "@/hooks/use-auth";
import { copy } from "@/copy/pt-BR";

const DIGEST_KEY = "viax_digest_sent";

/** Lembrete matinal local (opt-in) — sem servidor de push em v1. */
export function usePushDigest() {
  const { prefs } = useNotificationPrefs();
  const { userId } = useAuth();
  const { data: today } = useTodayCheckIn(userId);

  useEffect(() => {
    if (!prefs.pushDigest || today || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const day = new Date().toISOString().slice(0, 10);
    const sentKey = `${DIGEST_KEY}_${day}`;
    if (localStorage.getItem(sentKey)) return;

    const h = new Date().getHours();
    if (h < 8 || h > 10) return;

    try {
      new Notification("ViaX · Pulso urbano", {
        body: copy.retention.dailyPulseCta,
        tag: "viax-digest",
      });
      localStorage.setItem(sentKey, "1");
    } catch {
      /* ignore */
    }
  }, [prefs.pushDigest, today]);
}
