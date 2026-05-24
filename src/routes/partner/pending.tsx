import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth-guards";
import { db } from "@/integrations/supabase/loose";
import { redirect } from "@tanstack/react-router";
import type { AccountContext } from "@/hooks/use-account-context";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/partner/pending")({
  beforeLoad: async () => {
    await requireAuth();
    const { data, error } = await db.rpc("get_my_account_context");
    if (error) throw redirect({ to: "/profile", search: { tab: "config" } });
    const ctx = data as AccountContext;
    if (ctx.partner?.role === "partner" && ctx.partner?.status === "active") {
      throw redirect({ to: "/partner" });
    }
    if (ctx.partner?.role !== "applicant") {
      throw redirect({ to: "/profile", search: { tab: "config" } });
    }
  },
  component: PartnerPendingPage,
});

function PartnerPendingPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-lg font-semibold">{copy.partner.pendingPageTitle}</h1>
      <p className="text-sm text-muted-foreground">{copy.partner.pendingPageDesc}</p>
      <p className="text-sm text-warn">{copy.partner.applyPending}</p>
      <Link
        to="/profile"
        search={{ tab: "config" }}
        className="inline-flex rounded-lg border px-4 py-2 text-sm hover:bg-surface"
      >
        {copy.partner.pendingBackToSettings}
      </Link>
    </div>
  );
}
