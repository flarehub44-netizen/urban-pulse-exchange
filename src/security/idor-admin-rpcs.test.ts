import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const anonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
const traderEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const traderPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;

const CRITICAL_ADMIN_RPCS = [
  "admin_freeze_account",
  "admin_update_kyc_status",
  "admin_clear_cpa_fraud_cases",
  "admin_suspend_cpa_fraud_partners",
  "admin_ban_cpa_fraud_users",
  "get_admin_users_list",
  "admin_force_close",
] as const;

describe("IDOR — admin RPCs", () => {
  it.skipIf(!url || !anonKey || !traderEmail || !traderPassword)(
    "non-admin JWT cannot call critical admin RPCs",
    async () => {
      const client = createClient(url!, anonKey!);
      const { error: signInErr } = await client.auth.signInWithPassword({
        email: traderEmail!,
        password: traderPassword!,
      });
      expect(signInErr).toBeNull();

      const { data: ctx } = await client.rpc("get_my_account_context");
      const isAdmin = (ctx as { admin?: { is_admin?: boolean } } | null)?.admin?.is_admin;
      if (isAdmin) {
        console.warn("[IDOR] test user is admin — skip or use dedicated non-admin credentials");
        return;
      }

      for (const rpc of CRITICAL_ADMIN_RPCS) {
        const { error } = await client.rpc(rpc, dummyArgs(rpc));
        expect(error, `RPC ${rpc} should reject non-admin`).not.toBeNull();
        expect(error?.message ?? "").toMatch(/admin only|Admin only|Unauthorized/i);
      }
    },
  );
});

function dummyArgs(rpc: string): Record<string, unknown> {
  switch (rpc) {
    case "admin_freeze_account":
      return { p_user_id: "00000000-0000-0000-0000-000000000001", p_frozen: true };
    case "admin_update_kyc_status":
      return {
        p_user_id: "00000000-0000-0000-0000-000000000001",
        p_status: "none",
        p_notes: "idor-test-note",
      };
    case "admin_clear_cpa_fraud_cases":
      return { p_action_note: "idor-test-note-12345678", p_only_confirmed: true };
    case "admin_suspend_cpa_fraud_partners":
      return { p_action_note: "idor-test-note-12345678" };
    case "admin_ban_cpa_fraud_users":
      return { p_action_note: "idor-test-note-12345678", p_only_confirmed: true };
    case "admin_force_close":
      return { p_market_id: "test-market", p_note: "idor" };
    default:
      return {};
  }
}
