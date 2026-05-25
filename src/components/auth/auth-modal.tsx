import { useEffect, useCallback, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

export function AuthModal() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const { userId, isRegistered } = useAuth();
  const { data: hasDeposited } = useHasDeposited(userId);
  const { openDeposit } = useDepositSheet();
  const {
    open,
    mode,
    redirect,
    upgrade,
    openDepositAfter,
    openLogin,
    openSignup,
    openForgot,
    setMode,
    close,
  } = useAuthModal();

  const urlAuth = parseAuthModalSearch(search);
  const urlWantDeposit = urlAuth.deposit === "1" || openDepositAfter;
  const urlSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!urlAuth.auth) {
      urlSynced.current = null;
      return;
    }
    const key = `${urlAuth.auth}:${urlAuth.redirect ?? ""}:${urlAuth.upgrade ?? ""}:${urlAuth.deposit ?? ""}`;
    if (urlSynced.current === key) return;
    urlSynced.current = key;
    const depositAfter = urlAuth.deposit === "1";
    if (urlAuth.auth === "login") {
      openLogin({ redirect: urlAuth.redirect, depositAfter });
      trackDepositFunnel("auth_modal_open", { mode: "login" });
    } else if (urlAuth.auth === "signup") {
      openSignup({
        redirect: urlAuth.redirect,
        upgrade: urlAuth.upgrade === "1",
        depositAfter,
      });
      trackDepositFunnel("auth_modal_open", { mode: "signup" });
    } else if (urlAuth.auth === "forgot") {
      openForgot();
    }
  }, [
    urlAuth.auth,
    urlAuth.redirect,
    urlAuth.upgrade,
    urlAuth.deposit,
    openLogin,
    openSignup,
    openForgot,
  ]);

  useEffect(() => {
    if (open && mode !== "forgot") {
      trackDepositFunnel("auth_modal_open", { mode });
    }
  }, [open, mode]);

  const clearAuthSearch = useCallback(() => {
    if (!urlAuth.auth && !urlAuth.deposit) return;
    navigate({
      search: (prev) => stripAuthModalSearch(prev as Record<string, unknown>),
      replace: true,
    });
  }, [navigate, urlAuth.auth, urlAuth.deposit]);

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
        ? upgrade
          ? copy.auth.upgradeTitle
          : copy.auth.signupTitle
        : copy.auth.forgotTitle;

  const subtitle =
    mode === "login"
      ? copy.auth.loginSubtitle
      : mode === "signup"
        ? upgrade
          ? copy.auth.upgradeSubtitle
          : copy.auth.signupSubtitle
        : copy.auth.forgotSubtitle;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-md gap-0 p-0">
        <div className="p-6">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          {subtitle && (
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {subtitle}
            </DialogDescription>
          )}
          <div className="mt-6">
            {mode === "login" && (
              <LoginForm onSuccess={finishAuth} onForgotPassword={() => setMode("forgot")} />
            )}
            {mode === "signup" && (
              <SignupForm
                isUpgrade={upgrade}
                onSuccess={() => {
                  trackDepositFunnel("signup_complete");
                  finishAuth();
                }}
                onNeedsVerify={() => {
                  handleClose();
                  navigate({ to: "/auth/verify" });
                }}
              />
            )}
            {mode === "forgot" && <ForgotPasswordForm onBackToLogin={() => setMode("login")} />}
          </div>
          {mode !== "forgot" && (
            <div className="mt-6 border-t pt-4 text-center text-sm">
              {mode === "login" ? (
                <>
                  {copy.auth.noAccount}{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline"
                  >
                    {copy.auth.signupLink}
                  </button>
                </>
              ) : (
                <>
                  {copy.auth.hasAccount}{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline"
                  >
                    {copy.auth.loginLink}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
