import { useEffect } from "react";
import { useViaX } from "@/store/viax-store";

/** Global heartbeat. Mount once at the app shell. */
export function useRealtimeTick(intervalMs = 1600) {
  const tick = useViaX((s) => s.tick);
  useEffect(() => {
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tick, intervalMs]);
}
