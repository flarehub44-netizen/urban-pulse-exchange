import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureAuthSession } from "@/lib/auth-session";
import { authModalRedirectTarget } from "@/lib/auth-modal-redirect";

export async function requireAuth() {
  const state = await ensureAuthSession();
  if (!state.userId) {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/dashboard";
    const { pathname, search } = authModalRedirectTarget(redirectTo, "login");
    throw redirect({ to: pathname, search });
  }
}

export async function requireRegistered() {
  await requireAuth();
  const state = await ensureAuthSession();
  if (!state.isRegistered) {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/dashboard";
    const { pathname, search } = authModalRedirectTarget(redirectTo, "signup");
    throw redirect({ to: pathname, search });
  }
}

export async function requireGuestOnly() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (user?.email && user.email_confirmed_at) {
    throw redirect({ to: "/dashboard" });
  }
}

export async function requirePartnerRoute() {
  await requireAuth();
  const { data, error } = await supabase.rpc("get_my_account_context");
  if (error) throw redirect({ to: "/dashboard" });

  const ctx = data as {
    partner?: { role?: string; status?: string };
  };
  const partner = ctx?.partner;
  if (partner?.role === "partner" && partner?.status === "active") return;

  if (partner?.role === "applicant") {
    throw redirect({ to: "/partner/pending" });
  }

  throw redirect({ to: "/profile", search: { tab: "config" } });
}

async function resolveIsAdmin(): Promise<boolean> {
  const { data: syncData, error: syncError } = await supabase.rpc("try_sync_admin_allowlist");
  if (!syncError && (syncData as { is_admin?: boolean } | null)?.is_admin === true) {
    return true;
  }

  const { data: ctx, error: ctxError } = await supabase.rpc("get_my_account_context");
  if (!ctxError && (ctx as { admin?: { is_admin?: boolean } } | null)?.admin?.is_admin === true) {
    return true;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.is_admin === true;
}

export async function requireAdminRoute() {
  await requireRegistered();
  const isAdmin = await resolveIsAdmin();
  if (!isAdmin) {
    throw redirect({ to: "/dashboard" });
  }
}
