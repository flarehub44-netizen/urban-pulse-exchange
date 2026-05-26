import { usePlatformFlag } from "@/hooks/use-platform-flag";

export function useFootballEnabled() {
  return usePlatformFlag("football_enabled", true);
}
