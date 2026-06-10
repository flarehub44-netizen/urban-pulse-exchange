import { z } from "zod";

/** Mirrors `admin_update_setting` allowlist in Supabase migrations. */
export const PLATFORM_SETTING_KEYS = [
  "house_fee_rate",
  "max_stake",
  "market_duration_hours",
  "regions_enabled",
  "regions_simulator_enabled",
  "partner_program_enabled",
  "default_revenue_share_pct",
  "sub_override_pct",
  "min_payout_amount",
  "default_cpa_amount",
  "cpa_min_deposit_threshold",
  "casino_enabled",
  "casino_impulse_max_per_hour",
  "camera_oracle_enabled",
  "crypto_short_term_enabled",
  "football_enabled",
  "football_league_ids",
  "football_sync_days_back",
  "football_sync_days_ahead",
  "football_sync_base_date",
  "football_betting_close_minutes",
  "football_auto_approve",
  "football_regulation",
  "football_auto_resolve",
] as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];

const booleanKeys = new Set<PlatformSettingKey>([
  "regions_enabled",
  "regions_simulator_enabled",
  "partner_program_enabled",
  "casino_enabled",
  "camera_oracle_enabled",
  "crypto_short_term_enabled",
  "football_enabled",
  "football_auto_approve",
  "football_regulation",
  "football_auto_resolve",
]);

const stringKeys = new Set<PlatformSettingKey>(["football_sync_base_date"]);

const arrayKeys = new Set<PlatformSettingKey>(["football_league_ids"]);

export const adminUpdateSettingSchema = z
  .object({
    key: z.enum(PLATFORM_SETTING_KEYS),
    value: z.unknown(),
  })
  .superRefine((data, ctx) => {
    const { key, value } = data;
    if (booleanKeys.has(key)) {
      if (typeof value !== "boolean") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor deve ser booleano", path: ["value"] });
      }
      return;
    }
    if (stringKeys.has(key)) {
      if (typeof value !== "string" || value.length > 32) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor deve ser texto (máx. 32)", path: ["value"] });
      }
      return;
    }
    if (arrayKeys.has(key)) {
      if (!Array.isArray(value) || !value.every((v) => typeof v === "number" || typeof v === "string")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor deve ser lista de IDs", path: ["value"] });
      }
      return;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor deve ser numérico", path: ["value"] });
    }
  });
