import { useEffect, useCallback, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { parseAuthModalSearch, stripAuthModalSearch } from "@/lib/auth-modal-search";
import { copy } from "@/copy/pt-BR";

export function AuthModal() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const {
    open,
    mode,
    redirect,
    upgrade,
    openLogin,
    openSignup,
    openForgot,
    setMode,
    close,
  } = useAuthModal();

  const urlAuth = parseAuthModalSearch(search);
  const urlSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!urlAuth.auth) {
      urlSynced.current = null;
      return;
    }
    const key = `${urlAuth.auth}:${urlAuth.redirect ?? ""}:${urlAuth.upgrade ?? ""}`;
    if (urlSynced.current === key) return;
    urlSynced.current = key;
    if (urlAuth.auth === "login") {
      openLogin({ redirect: urlAuth.redirect });
    } else if (urlAuth.auth === "signup") {
      openSignup({ redirect: urlAuth.redirect, upgrade: urlAuth.upgrade === "1" });
    } else if (urlAuth.auth === "forgot") {
      openForgot();
    }
  }, [urlAuth.auth, urlAuth.redirect, urlAuth.upgrade, openLogin, openSignup, openForgot]);

  const clearAuthSearch = useCallback(() => {
    if (!urlAuth.auth) return;
    navigate({
      search: (prev) => stripAuthModalSearch(prev as Record<string, unknown>),
      replace: true,
    });
  }, [navigate, urlAuth.auth]);

  const handleClose = () => {
    close();
    clearAuthSearch();
  };

  const finishAuth = () => {
    const dest = redirect ?? "/dashboard";
    handleClose();
    try {
      const url = new URL(dest, window.location.origin);
      const search: Record<string, string> = {};
      url.searchParams.forEach((v, k) => {
        search[k] = v;
      });
      navigate({
        to: url.pathname,
        search: Object.keys(search).length > 0 ? search : undefined,
        replace: true,
      });
    } catch {
      navigate({ to: "/dashboard", replace: true });
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
              <LoginForm
                onSuccess={finishAuth}
                onForgotPassword={() => setMode("forgot")}
              />
            )}
            {mode === "signup" && (
              <SignupForm
                isUpgrade={upgrade}
                onSuccess={finishAuth}
                onNeedsVerify={() => {
                  handleClose();
                  navigate({ to: "/auth/verify" });
                }}
              />
            )}
            {mode === "forgot" && (
              <ForgotPasswordForm onBackToLogin={() => setMode("login")} />
            )}
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
