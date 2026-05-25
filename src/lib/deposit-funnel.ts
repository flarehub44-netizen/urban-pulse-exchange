import { db } from "@/integrations/supabase/loose";

export type DepositFunnelEvent =
  | "auth_modal_open"
  | "signup_complete"
  | "deposit_sheet_open"
  | "deposit_qr_shown"
  | "deposit_paid";

const SESSION_KEY = "viax_deposit_session";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function trackDepositFunnel(
  event: DepositFunnelEvent,
  props?: Record<string, string | number | boolean | undefined>,
) {
  if (typeof window === "undefined") return;
  const detail = { event, ...props, ts: Date.now() };
  window.dispatchEvent(new CustomEvent("viax:deposit_funnel", { detail }));
  if (import.meta.env.DEV) {
    console.debug("[deposit_funnel]", detail);
  }

  const cleanProps = props
    ? Object.fromEntries(
        Object.entries(props).filter(([, v]) => v !== undefined),
      )
    : {};

  void db
    .rpc("track_deposit_funnel_event", {
      p_event: event,
      p_props: cleanProps,
      p_session_id: getSessionId(),
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn("[deposit_funnel] persist failed", error.message);
      }
    });
}
