import { useEffect, useState } from "react";

/** Mount below-the-fold widgets only after idle or when the user scrolls near the bottom. */
export function useBelowFoldMount(fallbackMs = 2000) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    const activate = () => setReady(true);

    const onScroll = () => {
      const doc = document.documentElement;
      const scrolled = window.scrollY + window.innerHeight;
      const threshold = doc.scrollHeight * 0.55;
      if (scrolled >= threshold) activate();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    let idleId: number | undefined;
    if (typeof requestIdleCallback === "function") {
      idleId = requestIdleCallback(activate, { timeout: fallbackMs + 600 });
    }
    const timer = window.setTimeout(activate, fallbackMs);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
      if (idleId != null && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleId);
      }
    };
  }, [fallbackMs, ready]);

  return ready;
}
