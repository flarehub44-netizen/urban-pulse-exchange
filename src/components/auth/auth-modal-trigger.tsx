import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuthModal } from "@/hooks/use-auth-modal";

type AuthModalTriggerProps = {
  mode: "login" | "signup";
  redirect?: string;
  upgrade?: boolean;
  depositAfter?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export function AuthModalTrigger({
  mode,
  redirect,
  upgrade,
  depositAfter,
  className,
  children,
  onClick,
}: AuthModalTriggerProps) {
  const { openLogin, openSignup } = useAuthModal();

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        if (mode === "login") openLogin({ redirect, depositAfter });
        else openSignup({ redirect, upgrade, depositAfter });
      }}
      className={cn(className)}
    >
      {children}
    </button>
  );
}
