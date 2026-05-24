import { supabase } from "@/integrations/supabase/client";
import { grantEmailLinkBonusFn } from "@/actions/retention";

const DONE_KEY = "viax_post_registration_done";

export async function runPostRegistrationFlow(displayName?: string | null) {
  if (typeof window === "undefined") return;
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return;
  if (sessionStorage.getItem(`${DONE_KEY}:${uid}`) === "1") return;

  try {
    const { data, error } = await supabase.rpc("complete_registration", {
      p_display_name: displayName?.trim() || undefined,
    });
    if (error) console.warn("[auth] complete_registration:", error.message);

    const payload = data as { ok?: boolean; reason?: string };
    if (payload?.ok === false && payload?.reason === "email_not_confirmed") return;

    try {
      const bonus = await grantEmailLinkBonusFn({ data: undefined });
      if (!bonus.already_claimed) {
        sessionStorage.setItem(`${DONE_KEY}:${uid}`, "1");
        return;
      }
    } catch {
      /* migration / offline */
    }

    sessionStorage.setItem(`${DONE_KEY}:${uid}`, "1");
  } catch (err) {
    console.warn("[auth] post-registration flow failed:", err);
  }
}
