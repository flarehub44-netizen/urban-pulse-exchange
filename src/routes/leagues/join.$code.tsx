import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { requireRegistered } from "@/lib/auth-guards";
import { joinLeagueFn } from "@/actions/leagues";
import { copy } from "@/copy/pt-BR";
import { AppLoadingSkeleton } from "@/components/viax/app-loading-skeleton";

export const Route = createFileRoute("/leagues/join/$code")({
  beforeLoad: () => requireRegistered(),
  component: LeagueJoinRedirectPage,
});

function LeagueJoinRedirectPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await joinLeagueFn({ data: { invite_code: code.toUpperCase() } });
        if (cancelled) return;
        if (res.ok) {
          if (res.already_member) toast.message(copy.leagues.alreadyMember);
          else if (res.name) toast.success(copy.leagues.joinSuccess(res.name));
          navigate({
            to: "/leagues",
            search: res.league_id ? { selected: res.league_id } : {},
            replace: true,
          });
          return;
        }
        if (res.reason === "league_full") setError(copy.leagues.leagueFull);
        else setError(copy.leagues.invalidCode);
      } catch {
        if (!cancelled) setError(copy.leagues.joinError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-down">{error}</p>
        <button
          type="button"
          className="mt-4 text-sm text-primary hover:underline"
          onClick={() => navigate({ to: "/leagues" })}
        >
          {copy.nav.leagues}
        </button>
      </div>
    );
  }

  return <AppLoadingSkeleton />;
}
