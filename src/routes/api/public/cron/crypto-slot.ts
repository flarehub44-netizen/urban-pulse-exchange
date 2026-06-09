import { createFileRoute } from "@tanstack/react-router";
import { getServiceClient } from "@/lib/supabase-service.server";

export const Route = createFileRoute("/api/public/cron/crypto-slot")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization");
        const secret = process.env.CRON_SECRET;
        if (secret && auth !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        const supabase = getServiceClient();
        const { data, error } = await supabase.rpc("cron_open_crypto_slot", {
          p_interval_minutes: 15,
        });
        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        return Response.json({ ok: true, ...((data as object) ?? {}) });
      },
    },
  },
});
