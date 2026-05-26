import { useEffect, useState } from "react";

/** Avoid SSR/CSR markup drift for client-only UI (charts, feeds, etc.). */
export function useClientOnly(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return ready;
}
