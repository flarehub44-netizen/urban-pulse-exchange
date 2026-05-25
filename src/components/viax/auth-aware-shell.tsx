import type { ReactNode } from "react";
import { AppShell } from "@/components/viax/app-shell";
import { PublicShell } from "@/components/viax/public-shell";
import { AppLoadingSkeleton } from "@/components/viax/app-loading-skeleton";
import { useAuthPublic } from "@/hooks/use-auth-public";

type AuthAwareShellProps = {
  children: ReactNode;
};

export function AuthAwareShell({ children }: AuthAwareShellProps) {
  const { isRegistered, authReady } = useAuthPublic();

  if (!authReady) {
    return <AppLoadingSkeleton />;
  }

  if (isRegistered) {
    return <AppShell>{children}</AppShell>;
  }

  return <PublicShell>{children}</PublicShell>;
}
