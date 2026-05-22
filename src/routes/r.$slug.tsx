import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db as supabase } from "@/integrations/supabase/loose";
import { storePartnerRef } from "@/lib/partner-attribution";

export const Route = createFileRoute("/r/$slug")({
  component: PartnerRedirectPage,
});

type ResolveResult = {
  ok?: boolean;
  slug?: string;
  partner_id?: string;
  campaign_id?: string;
  target?: { path?: string; market_id?: string; city?: string };
};

function PartnerRedirectPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: rpcErr } = await supabase.rpc("track_partner_click", {
        p_slug: slug,
        p_campaign_id: null,
        p_ip_hash: null,
      });
      if (cancelled) return;
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      const res = data as ResolveResult;
      if (!res?.ok || !res.slug) {
        setError("Link não encontrado");
        return;
      }
      storePartnerRef(res.slug, res.campaign_id);
      const target = res.target ?? { path: "/dashboard" };
      if (target.market_id) {
        navigate({
          to: "/markets/$marketId",
          params: { marketId: target.market_id },
          replace: true,
        });
      } else if (target.city) {
        navigate({ to: "/live", search: { city: target.city }, replace: true });
      } else {
        navigate({ to: (target.path as "/dashboard") || "/dashboard", replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground animate-pulse">Redirecionando…</p>
    </div>
  );
}
