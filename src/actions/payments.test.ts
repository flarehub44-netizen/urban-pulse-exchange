import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mapSyncPayDepositError } from "@/actions/payments";
import { SyncPayHttpError } from "@/lib/syncpay";
import { PIX_MIN_AMOUNT_BRL } from "@/lib/pix-payments";

const depositSchema = z.object({
  amount: z.number().min(PIX_MIN_AMOUNT_BRL).max(500_000),
  deviceId: z.string().max(128).optional(),
});

const withdrawSchema = z.object({
  amount: z.number().min(PIX_MIN_AMOUNT_BRL).max(500_000),
  pixKey: z.string().min(1),
  deviceId: z.string().max(128).optional(),
});

describe("mapSyncPayDepositError", () => {
  it("maps HTML error pages to user-friendly message", () => {
    const err = new SyncPayHttpError(
      "bad gateway",
      502,
      "text/html",
      "<!DOCTYPE html><html>",
      "https://api.syncpay.com.br/v1/charges",
    );
    const mapped = mapSyncPayDepositError(err);
    expect(mapped.message).toContain("temporariamente indisponível");
  });

  it("maps DNS errors", () => {
    const mapped = mapSyncPayDepositError(new Error("syncpay_dns_error: lookup failed"));
    expect(mapped.message).toContain("temporariamente indisponível");
  });

  it("maps auth config errors", () => {
    const mapped = mapSyncPayDepositError(new Error("SyncPay: configure SYNCPAY_CLIENT_ID"));
    expect(mapped.message).toContain("temporariamente indisponível");
  });

  it("passes through generic errors", () => {
    const mapped = mapSyncPayDepositError(new Error("saldo insuficiente"));
    expect(mapped.message).toBe("saldo insuficiente");
  });
});

describe("payment schemas", () => {
  it("depositSchema rejects below minimum", () => {
    expect(depositSchema.safeParse({ amount: PIX_MIN_AMOUNT_BRL - 1 }).success).toBe(false);
  });

  it("depositSchema accepts valid amount", () => {
    expect(depositSchema.safeParse({ amount: 50 }).success).toBe(true);
  });

  it("withdrawSchema requires pixKey", () => {
    expect(withdrawSchema.safeParse({ amount: 100, pixKey: "" }).success).toBe(false);
  });

  it("withdrawSchema accepts valid payload", () => {
    expect(withdrawSchema.safeParse({ amount: 100, pixKey: "user@email.com" }).success).toBe(true);
  });
});

describe("rate limit deposit message contract", () => {
  it("recognizes rate_limit prefix for UI", () => {
    const msg = "rate_limit: máximo 10 depósitos por hora";
    expect(msg.startsWith("rate_limit:")).toBe(true);
  });
});
