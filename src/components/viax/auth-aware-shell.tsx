import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/viax/app-shell";
import { PublicShell } from "@/components/viax/public-shell";
import { AppLoadingSkeleton } from "@/components/viax/app-loading-skeleton";
import { useAuthPublic } from "@/hooks/use-auth-public";
import { useProfile } from "@/hooks/use-profile";

type AuthAwareShellProps = {
  children: ReactNode;
};

export function AuthAwareShell({ children }: AuthAwareShellProps) {
  const [mounted, setMounted] = useState(false);
  const { userId, authReady, isRegistered } = useAuthPublic();
  const { data: profile, isLoading: profileLoading } = useProfile(userId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep first SSR/CSR paint deterministic to avoid hydration mismatches.
  if (!mounted) {
    return <PublicShell>{children}</PublicShell>;
  }

  if (!authReady) {
    return <AppLoadingSkeleton />;
  }

  if (userId && isRegistered) {
    if (profileLoading || !profile) {
      return <AppLoadingSkeleton />;
    }
    return <AppShell>{children}</AppShell>;
  }

  return <PublicShell>{children}</PublicShell>;
}
