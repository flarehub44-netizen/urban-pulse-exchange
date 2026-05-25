import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseAuthSession } from "@/lib/auth";
import { runPostRegistrationFlow } from "@/lib/post-registration";
import { copy } from "@/copy/pt-BR";
import { AuthShell } from "@/components/auth/auth-shell";
import { db } from "@/integrations/supabase/loose";
import { getDefaultPostAuthPath } from "@/lib/post-auth-redirect";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const type = params.get("type");

        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) throw exchangeErr;
        }

        const {
          data: { session },
          error: sessionErr,
        } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;

        const auth = parseAuthSession(session);
        if (auth.isRegistered) {
          const displayName =
            session?.user.user_metadata?.display_name ??
            session?.user.user_metadata?.full_name ??
            null;
          await runPostRegistrationFlow(
            typeof displayName === "string" ? displayName : null,
          );
        }

        if (cancelled) return;

        if (type === "recovery") {
          navigate({ to: "/markets", search: { auth: "login" }, replace: true });
          return;
        }

        let hasDeposited = false;
        if (auth.userId) {
          const { data } = (await db
            .from("transactions")
            .select("id")
            .eq("type", "deposit")
            .gt("amount", 0)
            .limit(1)) as { data: { id: string }[] | null };
          hasDeposited = (data?.length ?? 0) > 0;
        }

        const dest = getDefaultPostAuthPath(hasDeposited);
        if (dest.includes("?")) {
          const [pathname, qs] = dest.split("?");
          const params = new URLSearchParams(qs);
          const search: Record<string, string> = {};
          params.forEach((v, k) => {
            search[k] = v;
          });
          navigate({ to: pathname, search, replace: true });
        } else {
          navigate({ to: dest, replace: true });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : copy.errors.generic);
        }
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <AuthShell title={copy.auth.callbackTitle} subtitle={copy.auth.callbackSubtitle}>
      {error ? (
        <p className="text-sm text-down">{error}</p>
      ) : (
        <p className="text-sm text-muted-foreground animate-pulse">{copy.auth.loading}</p>
      )}
    </AuthShell>
  );
}
