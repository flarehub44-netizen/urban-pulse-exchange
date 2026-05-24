import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureAuthSession } from "@/lib/auth-session";
import { db } from "@/integrations/supabase/loose";

export async function requireAuth() {
  const state = await ensureAuthSession();
  if (!state.userId) {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/dashboard";
    throw redirect({ to: "/auth/login", search: { redirect: redirectTo } });
  }
}

export async function requireRegistered() {
  await requireAuth();
  const state = await ensureAuthSession();
  if (!state.isRegistered) {
    throw redirect({
      to: "/auth/signup",
      search: { upgrade: "1" },
    });
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
  const { data, error } = await db.rpc("get_my_account_context");
  if (error) throw redirect({ to: "/dashboard" });

  const ctx = data as {
    partner?: { role?: string; status?: string };
  };
  const partner = ctx?.partner;
  if (partner?.role === "partner" && partner?.status === "active") return;

  if (partner?.role === "applicant") {
    throw redirect({ to: "/profile", search: { tab: "config" } });
  }

  throw redirect({ to: "/profile", search: { tab: "config" } });
}

export async function requireAdminRoute() {
  await requireRegistered();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw redirect({ to: "/auth/login" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    throw redirect({ to: "/dashboard" });
  }
}
