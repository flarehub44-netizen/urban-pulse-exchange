import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { copy } from "@/copy/pt-BR";
import { dismissAnonBanner, isAnonBannerDismissed } from "@/lib/anon-account-storage";

export function AnonAccountBanner({ onProtect }: { onProtect?: () => void }) {
  const { userId, isAnonymous, isRegistered } = useAuth();
  const [hidden, setHidden] = useState(() => isAnonBannerDismissed());

  const isAnon = isAnonymous && !isRegistered;

  if (!userId || !isAnon || hidden) return null;

  return (
    <div
      data-testid="anon-account-banner"
      className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/5 p-4"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
      <div className="flex-1 text-sm">
        <span className="font-medium text-warn">Conta anônima</span>
        <span className="ml-1 text-muted-foreground">
          — vincule um e-mail para não perder saldo e histórico.
        </span>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center">
        {onProtect ? (
          <button
            type="button"
            onClick={onProtect}
            className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs font-medium text-warn hover:bg-warn/20"
          >
            Proteger conta
          </button>
        ) : (
          <Link
            to="/auth/signup"
            search={{ upgrade: "1" }}
            className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs font-medium text-warn hover:bg-warn/20"
          >
            {copy.auth.registerCta}
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            dismissAnonBanner(7);
            setHidden(true);
          }}
          className="rounded-xl px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {copy.auth.anonBannerDismiss}
        </button>
      </div>
    </div>
  );
}
