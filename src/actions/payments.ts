import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRegisteredAuth } from "@/integrations/supabase/require-registered-middleware";
import { getSupabaseCtx } from "@/integrations/supabase/context";
import { createPixCharge, createPixPayout, SyncPayHttpError } from "@/lib/syncpay";
import { getServiceClient } from "@/lib/supabase-service.server";
import { PIX_MIN_AMOUNT_BRL } from "@/lib/pix-payments";
import { formatBRL } from "@/lib/parimutuel";
import { logApiMetric } from "@/lib/structured-log.server";
import { assertActionVelocity } from "@/lib/velocity.server";

function logFinancialReconciliationIssue(input: {
  stage: string;
  userId: string;
  intentId: string;
  amount: number;
  error: string;
}) {
  console.error("[FinancialReconciliationIssue]", input);
}

function mapSyncPayDepositError(error: unknown): Error {
  if (error instanceof SyncPayHttpError) {
    const looksLikeHtml = error.contentType.includes("text/html") || error.responseSnippet.includes("<!DOCTYPE");
    if (looksLikeHtml) {
      console.error("[SyncPayConfigIssue] syncpay_html_error_page", {
        status: error.status,
        contentType: error.contentType,
        requestUrl: error.requestUrl,
        bodySnippet: error.responseSnippet,
      });
      return new Error(
        "Pagamento Pix temporariamente indisponível. Nossa equipe foi alertada — tente novamente em alguns minutos.",
      );
    }
    if (error.message.includes("syncpay_dns_error")) {
      return new Error(
        "Pagamento Pix temporariamente indisponível. Nossa equipe foi alertada — tente novamente em alguns minutos.",
      );
    }
  }
  const raw = error instanceof Error ? error.message : "";
  if (raw.includes("syncpay_auth_html_error") || raw.includes("SyncPay: configure")) {
    return new Error(
      "Pagamento Pix temporariamente indisponível. Nossa equipe foi alertada — tente novamente em alguns minutos.",
    );
  }
  return error instanceof Error ? error : new Error("Falha ao criar cobrança Pix. Tente novamente.");
}


async function requireUserPixProfile(service: ReturnType<typeof getServiceClient>, userId: string) {
  const { data: profile, error } = await service
    .from("profiles")
    .select("cpf, name, phone")
    .eq("id", userId)
    .single();

  if (error) throw new Error("Não foi possível validar CPF do cadastro");

  const cpfDigits = String(profile?.cpf ?? "").replace(/\D/g, "");
  if (cpfDigits.length !== 11) {
    throw new Error("Cadastre um CPF válido no perfil para usar Pix.");
  }

  return {
    cpfDigits,
    name: String(profile?.name ?? "").trim() || "ViaX",
    phoneDigits: String(profile?.phone ?? "").replace(/\D/g, ""),
  };
}

const depositSchema = z.object({
  amount: z.number().min(PIX_MIN_AMOUNT_BRL).max(500_000),
  deviceId: z.string().max(128).optional(),
});

const withdrawSchema = z.object({
  amount: z.number().min(PIX_MIN_AMOUNT_BRL).max(500_000),
  pixKey: z.string().min(1),
  deviceId: z.string().max(128).optional(),
});

/**
 * Inicia um depósito Pix real via SyncPay.
 * Retorna qr_code (EMV) e qr_code_img (base64) para exibição na UI.
 */
export const initiateDepositFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRegisteredAuth])
  .inputValidator(depositSchema)
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { userId } = getSupabaseCtx(context);
    const service = getServiceClient();

    try {
      await assertActionVelocity("deposit", userId, data.deviceId);

      const { data: rl } = await service.rpc("service_assert_rate_limit", {
        p_key: `deposit:user:${userId}`,
        p_max: 10,
        p_window_seconds: 3600,
      });
      if ((rl as { limited?: boolean } | null)?.limited) {
        throw new Error("rate_limit: máximo 10 depósitos por hora. Tente novamente mais tarde.");
      }

      const { cpfDigits, name, phoneDigits } = await requireUserPixProfile(service, userId);
      const { data: authUserData } = await service.auth.admin.getUserById(userId);
      const email = String(authUserData?.user?.email ?? "").trim();

      // 1. Criar o intent no banco (status: pending)
      const { data: intent, error: intentErr } = await service
        .from("payment_intents")
        .insert({
          user_id: userId,
          type: "deposit",
          amount: data.amount,
          status: "pending",
          meta: { cpf_last4: cpfDigits.slice(-4) },
        })
        .select("id")
        .single();

      if (intentErr || !intent) {
        throw new Error("Falha ao registrar intenção de pagamento");
      }

      // 2. Chamar SyncPay para gerar QR Code Pix
      let charge;
      try {
        charge = await createPixCharge({
          amount: data.amount,
          correlationId: intent.id,
          description: `Depósito ViaX — ${formatBRL(data.amount)}`,
          expiresInMinutes: 30,
        client: {
          name,
          cpf: cpfDigits,
          email: email || undefined,
          phone: phoneDigits || undefined,
        },
        });
      } catch (error) {
        const mappedError = mapSyncPayDepositError(error);
        await service
          .from("payment_intents")
          .update({
            status: "failed",
            meta: {
              reason: "provider_charge_init_failed",
              message: mappedError.message,
            },
          })
          .eq("id", intent.id);
        throw mappedError;
      }
      console.info("[SyncPay] deposit charge created", {
        intentId: intent.id,
        providerId: charge.id,
        amount: data.amount,
      });

      // 3. Atualizar intent com dados do provider
      const { error: updateIntentErr } = await service
        .from("payment_intents")
        .update({
          provider_id: charge.id,
          qr_code: charge.qr_code,
          qr_code_img: charge.qr_code_base64,
          expires_at: charge.expiration,
          status: "pending",
          provider_payload: charge as unknown as Record<string, unknown>,
          meta: charge as unknown as Record<string, unknown>,
        })
        .eq("id", intent.id);
      if (updateIntentErr) {
        logFinancialReconciliationIssue({
          stage: "deposit.intent_update_after_provider_create",
          userId,
          intentId: intent.id,
          amount: data.amount,
          error: updateIntentErr.message,
        });
        await service
          .from("payment_intents")
          .update({
            status: "failed",
            meta: {
              reason: "intent_update_failed_after_charge_created",
              message: updateIntentErr.message,
              provider_id: charge.id,
            },
          })
          .eq("id", intent.id);
        throw new Error("Falha ao consolidar intenção de depósito. Tente novamente.");
      }

      logApiMetric("bff.initiate_deposit", { ok: true, durationMs: Date.now() - started });
      return {
        intentId: intent.id,
        providerId: charge.id,
        qrCode: charge.qr_code,
        qrCodeImg: charge.qr_code_base64,
        expiresAt: charge.expiration,
      };
    } catch (e) {
      logApiMetric("bff.initiate_deposit", { ok: false, durationMs: Date.now() - started });
      throw e;
    }
  });

/**
 * Inicia um saque Pix real via SyncPay.
 * O saldo é reservado imediatamente via request_withdrawal RPC.
 * A efetivação ocorre via webhook ao confirmar o payout.
 */
export const initiateWithdrawFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRegisteredAuth])
  .inputValidator(withdrawSchema)
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { supabase, userId } = getSupabaseCtx(context);
    const service = getServiceClient();

    try {
      await assertActionVelocity("withdraw", userId, data.deviceId);

      const { cpfDigits, name } = await requireUserPixProfile(service, userId);

      // RPC cria o intent + reserva o saldo + aplica KYC gate
      const { data: result, error } = await supabase.rpc("request_withdrawal", {
        p_amount: data.amount,
        p_pix_key: data.pixKey,
      });

      if (error) throw new Error(error.message);
      const parsed = result as { intent_id: string; balance: number };
      let providerId: string | undefined;

      try {
        const payout = await createPixPayout({
          amount: data.amount,
          pixKey: data.pixKey,
          correlationId: parsed.intent_id,
          description: `Saque ViaX — ${formatBRL(data.amount)}`,
          document: cpfDigits,
          beneficiaryName: name,
        });
        console.info("[SyncPay] payout created", {
          intentId: parsed.intent_id,
          providerId: payout.id,
          amount: data.amount,
        });

        const { error: updateErr } = await service
          .from("payment_intents")
          .update({
            provider_id: payout.id,
            status: "pending",
            provider_payload: payout as unknown as Record<string, unknown>,
            meta: payout as unknown as Record<string, unknown>,
          })
          .eq("id", parsed.intent_id);

        if (updateErr) {
          throw new Error(updateErr.message);
        }
        providerId = payout.id;
      } catch (payoutErr) {
        // Se falhar ao criar payout no provider, estorna a reserva imediatamente.
        const { error: refundErr } = await service.rpc("service_refund_withdrawal", {
          p_user_id: userId,
          p_amount: data.amount,
          p_intent_id: parsed.intent_id,
        });
        if (refundErr) {
          logFinancialReconciliationIssue({
            stage: "withdraw.refund_after_payout_failure",
            userId,
            intentId: parsed.intent_id,
            amount: data.amount,
            error: refundErr.message,
          });
        }
        await service
          .from("payment_intents")
          .update({
            status: "failed",
            meta: {
              reason: "payout_init_failed",
              message: payoutErr instanceof Error ? payoutErr.message : "unknown_error",
              refund_error: refundErr?.message ?? null,
              needs_manual_reconciliation: Boolean(refundErr),
            },
          })
          .eq("id", parsed.intent_id);
        throw new Error(
          payoutErr instanceof Error ? payoutErr.message : "Falha ao iniciar saque no provedor",
        );
      }

      logApiMetric("bff.initiate_withdraw", { ok: true, durationMs: Date.now() - started });
      return {
        intentId: parsed.intent_id,
        balance: parsed.balance,
        providerId,
      };
    } catch (e) {
      logApiMetric("bff.initiate_withdraw", { ok: false, durationMs: Date.now() - started });
      throw e;
    }
  });

/**
 * Busca o status de um intent de saque Pix (polling na UI).
 */
export const getWithdrawStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ intentId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { userId } = getSupabaseCtx(context);
    const service = getServiceClient();

    try {
      const { data: intent, error } = await service
        .from("payment_intents")
        .select("id, status, amount, type, created_at")
        .eq("id", data.intentId)
        .eq("user_id", userId)
        .eq("type", "withdraw")
        .single();

      if (error || !intent) throw new Error("Saque não encontrado");

      logApiMetric("bff.get_withdraw_status", { ok: true, durationMs: Date.now() - started });
      return intent as {
        id: string;
        status: "pending" | "paid" | "failed" | "expired";
        amount: number;
        created_at: string;
      };
    } catch (e) {
      logApiMetric("bff.get_withdraw_status", { ok: false, durationMs: Date.now() - started });
      throw e;
    }
  });

/**
 * Busca o status do último intent de depósito pendente do usuário.
 * Usado para polling enquanto o QR Code está sendo exibido.
 */
export const getDepositStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ intentId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { userId } = getSupabaseCtx(context);
    const service = getServiceClient();

    try {
      const { data: intent, error } = await service
        .from("payment_intents")
        .select("id, status, amount, created_at, expires_at, meta")
        .eq("id", data.intentId)
        .eq("user_id", userId)
        .single();

      if (error || !intent) throw new Error("Intent não encontrado");

      const meta =
        intent.meta && typeof intent.meta === "object" && !Array.isArray(intent.meta)
          ? (intent.meta as Record<string, unknown>)
          : {};
      const cpfCheck =
        typeof meta.cpf_check === "string" && meta.cpf_check.trim() ? meta.cpf_check.trim() : null;

      logApiMetric("bff.get_deposit_status", { ok: true, durationMs: Date.now() - started });
      return {
        id: intent.id as string,
        status: intent.status as "pending" | "paid" | "failed" | "expired",
        amount: Number(intent.amount),
        created_at: intent.created_at as string,
        expires_at: (intent.expires_at as string | null) ?? null,
        failureReason: cpfCheck,
      };
    } catch (e) {
      logApiMetric("bff.get_deposit_status", { ok: false, durationMs: Date.now() - started });
      throw e;
    }
  });
