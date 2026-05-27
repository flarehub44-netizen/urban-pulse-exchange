import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRegisteredAuth } from "@/integrations/supabase/require-registered-middleware";
import { getSupabaseCtx } from "@/integrations/supabase/context";
import { createClient } from "@supabase/supabase-js";
import { createPixCharge, createPixPayout } from "@/lib/syncpay";
import { PIX_MIN_AMOUNT_BRL } from "@/lib/pix-payments";
import { formatBRL } from "@/lib/parimutuel";
import { logApiMetric } from "@/lib/structured-log.server";

// Service-role client para escrita nas tabelas de pagamento
function getServiceClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireUserPixProfile(service: ReturnType<typeof getServiceClient>, userId: string) {
  const { data: profile, error } = await service
    .from("profiles")
    .select("cpf, name")
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
  };
}

const depositSchema = z.object({
  amount: z.number().min(PIX_MIN_AMOUNT_BRL).max(500_000),
});

const withdrawSchema = z.object({
  amount: z.number().min(PIX_MIN_AMOUNT_BRL).max(500_000),
  pixKey: z.string().min(1),
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
      const { cpfDigits } = await requireUserPixProfile(service, userId);

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
      const charge = await createPixCharge({
        amount: data.amount,
        correlationId: intent.id,
        description: `Depósito ViaX — ${formatBRL(data.amount)}`,
        expiresInMinutes: 30,
      });
      console.info("[SyncPay] deposit charge created", {
        intentId: intent.id,
        providerId: charge.id,
        amount: data.amount,
      });

      // 3. Atualizar intent com dados do provider
      await service
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
        await service.rpc("service_refund_withdrawal", {
          p_user_id: userId,
          p_amount: data.amount,
          p_intent_id: parsed.intent_id,
        });
        await service
          .from("payment_intents")
          .update({
            status: "failed",
            meta: {
              reason: "payout_init_failed",
              message: payoutErr instanceof Error ? payoutErr.message : "unknown_error",
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
        .select("id, status, amount, created_at, expires_at")
        .eq("id", data.intentId)
        .eq("user_id", userId)
        .single();

      if (error || !intent) throw new Error("Intent não encontrado");

      logApiMetric("bff.get_deposit_status", { ok: true, durationMs: Date.now() - started });
      return intent as {
        id: string;
        status: "pending" | "paid" | "failed" | "expired";
        amount: number;
        created_at: string;
        expires_at: string | null;
      };
    } catch (e) {
      logApiMetric("bff.get_deposit_status", { ok: false, durationMs: Date.now() - started });
      throw e;
    }
  });
