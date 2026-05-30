import { createMiddleware } from "@tanstack/start-client-core";
import { requireSupabaseAuth } from "./auth-middleware";

/**
 * Server-side admin gate composed on top of `requireSupabaseAuth`.
 *
 * Defense-in-depth: every admin DB RPC already calls `assert_admin()` which
 * enforces MFA + `has_role(uid,'admin')`. This middleware adds a fast 403 at
 * the serverFn boundary so non-admin callers are rejected before any DB
 * round-trip and so admin actions log a consistent "[admin-deny]" line.
 *
 * Usage:
 *   export const adminThingFn = createServerFn({ method: "POST" })
 *     .middleware([requireAdminAuth])
 *     .handler(async ({ context }) => {
 *       const { supabase, userId } = context;
 *       ...
 *     });
 */
export const requireAdminAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[admin-deny] profile lookup failed", { userId, error: error.message });
      throw new Error("Unauthorized: admin check failed");
    }
    if (!data?.is_admin) {
      console.warn("[admin-deny] non-admin attempted admin serverFn", { userId });
      throw new Error("Unauthorized: admin role required");
    }

    return next({ context });
  });
