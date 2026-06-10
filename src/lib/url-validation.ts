import { z } from "zod";

/** Rejects javascript:, data:, and other non-HTTPS schemes for user-supplied media URLs. */
export const httpsUrlSchema = z
  .string()
  .url()
  .refine((u) => {
    try {
      return new URL(u).protocol === "https:";
    } catch {
      return false;
    }
  }, "Apenas URLs HTTPS são permitidas");

export const optionalHttpsUrlSchema = httpsUrlSchema.optional();
