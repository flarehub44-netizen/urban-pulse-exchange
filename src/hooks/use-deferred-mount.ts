import { useEffect, useState } from "react";

/** Defer non-critical UI until after first paint / idle. */
export function useDeferredMount(fallbackMs = 120) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => setReady(true), { timeout: fallbackMs + 400 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => setReady(true), fallbackMs);
    return () => clearTimeout(t);
  }, [fallbackMs]);

  return ready;
}
