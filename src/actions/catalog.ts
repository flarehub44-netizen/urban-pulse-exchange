import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-service.server";
import { logApiMetric } from "@/lib/structured-log.server";
import { parseCatalogMarkets, type MarketVertical } from "@/lib/catalog-market";

const catalogFiltersSchema = z.object({
  vertical: z.string().optional(),
  topic: z.string().optional(),
  status: z.string().optional(),
  sort: z.enum(["volume", "closing", "trend", "new"]).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  q: z.string().optional(),
});

type CacheEntry = { expires: number; data: unknown };
const catalogCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function cacheKey(filters: z.infer<typeof catalogFiltersSchema>) {
  return JSON.stringify(filters);
}

export const listCatalogMarketsFn = createServerFn({ method: "GET" })
  .validator(catalogFiltersSchema)
  .handler(async ({ data }) => {
    const started = Date.now();
    const key = cacheKey(data);
    const hit = catalogCache.get(key);
    if (hit && hit.expires > Date.now()) {
      logApiMetric("bff.list_catalog_markets", {
        ok: true,
        durationMs: Date.now() - started,
        cache: "hit",
      });
      return parseCatalogMarkets(hit.data);
    }

    const supabase = getServiceClient();
    const { data: rows, error } = await supabase.rpc("list_catalog_markets", {
      p_vertical: (data.vertical as MarketVertical | undefined) ?? undefined,
      p_topic: data.topic ?? undefined,
      p_status: data.status ?? "live",
      p_sort: data.sort ?? "volume",
      p_limit: data.limit ?? 48,
      p_offset: data.offset ?? 0,
      p_q: data.q ?? undefined,
    });
    if (error) {
      logApiMetric("bff.list_catalog_markets", {
        ok: false,
        durationMs: Date.now() - started,
        cache: "miss",
      });
      throw error;
    }

    catalogCache.set(key, { expires: Date.now() + CACHE_TTL_MS, data: rows });
    logApiMetric("bff.list_catalog_markets", {
      ok: true,
      durationMs: Date.now() - started,
      cache: "miss",
    });
    return parseCatalogMarkets(rows);
  });
