import { useEffect, useCallback, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { useHasDeposited } from "@/hooks/use-has-deposited";
import { useAuth } from "@/hooks/use-auth";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { parseAuthModalSearch, stripAuthModalSearch } from "@/lib/auth-modal-search";
import { getDefaultPostAuthPath } from "@/lib/post-auth-redirect";
import { trackDepositFunnel } from "@/lib/deposit-funnel";
import { copy } from "@/copy/pt-BR";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

const MOBILE_AUTH_MQ = "(max-width: 767px)";

function parseRedirectPath(
  dest: string,
  wantDeposit: boolean,
): { pathname: string; search?: Record<string, string> } {
  try {
    const url = new URL(dest, window.location.origin);
    const search: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      search[k] = v;
    });
    if (wantDeposit) search.deposit = "1";
    return {
      pathname: url.pathname,
      search: Object.keys(search).length > 0 ? search : undefined,
    };
  } catch {
    return wantDeposit
      ? { pathname: "/markets", search: { status: "live", deposit: "1" } }
      : { pathname: "/dashboard" };
  }
}

type AuthModalBodyProps = {
  title: string;
  subtitle: string;
  mode: "login" | "signup" | "forgot";
  variant: "dialog" | "sheet";
  onFinishAuth: () => void;
  onForgot: () => void;
  onSignup: () => void;
  onLogin: () => void;
  onNeedsVerify: () => void;
};

function AuthModalBody({
  title,
  subtitle,
  mode,
  variant,
  onFinishAuth,
  onForgot,
  onSignup,
  onLogin,
  onNeedsVerify,
}: AuthModalBodyProps) {
  return (
    <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {variant === "sheet" ? (
        <>
          <SheetTitle className="text-xl font-semibold">{title}</SheetTitle>
          <SheetDescription className="mt-1 text-sm text-muted-foreground">{subtitle}</SheetDescription>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </>
      )}
      <div className="mt-6">
        {mode === "login" && (
          <LoginForm onSuccess={onFinishAuth} onForgotPassword={onForgot} />
        )}
        {mode === "signup" && (
          <SignupForm
            onSuccess={() => {
              trackDepositFunnel("signup_complete");
              onFinishAuth();
            }}
            onNeedsVerify={onNeedsVerify}
          />
        )}
        {mode === "forgot" && <ForgotPasswordForm onBackToLogin={onLogin} />}
      </div>
      {mode !== "forgot" && (
        <div className="mt-6 border-t pt-4 text-center text-sm">
          {mode === "login" ? (
            <>
              {copy.auth.noAccount}{" "}
              <button type="button" onClick={onSignup} className="text-primary hover:underline">
                {copy.auth.signupLink}
              </button>
            </>
          ) : (
            <>
              {copy.auth.hasAccount}{" "}
              <button type="button" onClick={onLogin} className="text-primary hover:underline">
                {copy.auth.loginLink}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AuthModal() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const { userId } = useAuth();
  const { data: hasDeposited } = useHasDeposited(userId);
  const { openDeposit } = useDepositSheet();
  const {
    open,
    mode,
    redirect,
    openDepositAfter,
    openLogin,
    openSignup,
    openForgot,
    setMode,
    close,
  } = useAuthModal();

  const [useMobileSheet, setUseMobileSheet] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_AUTH_MQ);
    const sync = () => setUseMobileSheet(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const urlAuth = parseAuthModalSearch(search);
  const urlWantDeposit = urlAuth.deposit === "1" || openDepositAfter;
  const urlSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!urlAuth.auth) {
      urlSynced.current = null;
      return;
    }
    const key = `${urlAuth.auth}:${urlAuth.redirect ?? ""}:${urlAuth.deposit ?? ""}`;
    if (urlSynced.current === key) return;
    urlSynced.current = key;
    const depositAfter = urlAuth.deposit === "1";
    if (urlAuth.auth === "login") {
      openLogin({ redirect: urlAuth.redirect, depositAfter });
      trackDepositFunnel("auth_modal_open", { mode: "login" });
    } else if (urlAuth.auth === "signup") {
      openSignup({ redirect: urlAuth.redirect, depositAfter });
      trackDepositFunnel("auth_modal_open", { mode: "signup" });
    } else if (urlAuth.auth === "forgot") {
      openForgot();
    }
  }, [urlAuth.auth, urlAuth.redirect, urlAuth.deposit, openLogin, openSignup, openForgot]);

  useEffect(() => {
    if (open && mode !== "forgot") {
      trackDepositFunnel("auth_modal_open", { mode });
    }
  }, [open, mode]);

  const clearAuthSearch = useCallback(() => {
    if (!urlAuth.auth && !urlAuth.deposit) return;
    const next = stripAuthModalSearch(search);
    const params = new URLSearchParams(next as Record<string, string>);
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, [search, urlAuth.auth, urlAuth.deposit]);

  const handleClose = () => {
    close();
    clearAuthSearch();
  };

  const finishAuth = async () => {
    const wantDeposit = urlWantDeposit;
    handleClose();

    const defaultDest = getDefaultPostAuthPath(hasDeposited === true);
    const dest = redirect ?? defaultDest;
    const { pathname, search: destSearch } = parseRedirectPath(dest, wantDeposit && !hasDeposited);

    navigate({ to: pathname, search: destSearch, replace: true });

    if (wantDeposit && hasDeposited !== true) {
      requestAnimationFrame(() => {
        openDeposit({ amount: 200, source: "post_auth" });
        toast.message(copy.depositFunnel.postSignupToast, {
          description: copy.casino.depositBonusCta,
        });
      });
    }
  };

  const title =
    mode === "login"
      ? copy.auth.loginTitle
      : mode === "signup"
        ? copy.auth.signupTitle
        : copy.auth.forgotTitle;

  const subtitle =
    mode === "login"
      ? copy.auth.loginSubtitle
      : mode === "signup"
        ? copy.auth.signupSubtitle
        : copy.auth.forgotSubtitle;

  const bodyProps = {
    title,
    subtitle,
    mode,
    onFinishAuth: finishAuth,
    onForgot: () => setMode("forgot"),
    onSignup: () => setMode("signup"),
    onLogin: () => setMode("login"),
    onNeedsVerify: () => {
      handleClose();
      navigate({ to: "/auth/verify" });
    },
  };

  const shell = (children: ReactNode) =>
    useMobileSheet ? (
      <Sheet open={open} onOpenChange={(next) => !next && handleClose()}>
        <SheetContent
          side="bottom"
          className={cn(
            "max-h-[92dvh] gap-0 overflow-y-auto rounded-t-2xl p-0",
            "data-[state=open]:slide-in-from-bottom",
          )}
          data-testid="auth-modal-sheet"
        >
          {children}
        </SheetContent>
      </Sheet>
    ) : (
      <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
        <DialogContent className="max-w-md gap-0 p-0" data-testid="auth-modal-dialog">
          <VisuallyHidden.Root>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </VisuallyHidden.Root>
          {children}
        </DialogContent>
      </Dialog>
    );

  return shell(
    <AuthModalBody
      {...bodyProps}
      variant={useMobileSheet ? "sheet" : "dialog"}
    />,
  );
}
