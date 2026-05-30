import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

async function buildClientIpHash(seed: string): Promise<string | undefined> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return undefined;
  try {
    const raw = [
      seed,
      navigator.userAgent ?? "",
      navigator.language ?? "",
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    ].join("|");
    const bytes = new TextEncoder().encode(raw);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex;
  } catch {
    return undefined;
  }
}

function PartnerRedirectPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ipHash = await buildClientIpHash(slug);
      const { data, error: rpcErr } = await supabase.rpc("track_partner_click", {
        p_slug: slug,
        p_campaign_id: undefined,
        p_ip_hash: ipHash,
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
      // Allowlist of safe internal prefixes for partner redirect targets.
      // Prevents open-redirect via maliciously crafted partner.target.path.
      const ALLOWED_PARTNER_PATHS = [
        "/dashboard",
        "/markets",
        "/live",
        "/football",
        "/ranking",
        "/feed",
        "/leagues",
        "/parceiros",
      ] as const;
      const isSafePath = (p: string | undefined): p is string =>
        typeof p === "string" &&
        p.startsWith("/") &&
        !p.startsWith("//") &&
        !p.startsWith("/api") &&
        !p.startsWith("/admin") &&
        ALLOWED_PARTNER_PATHS.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));

      if (target.market_id) {
        navigate({
          to: "/markets/$marketId",
          params: { marketId: target.market_id },
          replace: true,
        });
      } else if (target.city) {
        navigate({ to: "/live", search: { city: target.city }, replace: true });
      } else {
        const safe = isSafePath(target.path) ? target.path : "/dashboard";
        navigate({ to: safe as "/dashboard", replace: true });
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
