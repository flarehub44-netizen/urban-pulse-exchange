import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRegisteredAuth } from "@/integrations/supabase/require-registered-middleware";
import type { SupabaseFnContext } from "@/integrations/supabase/loose";
import { createClient } from "@supabase/supabase-js";
import { createPixCharge } from "@/lib/syncpay";
import { formatBRL } from "@/lib/parimutuel";

// Service-role client para escrita nas tabelas de pagamento
function getServiceClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const depositSchema = z.object({
  amount: z.number().positive().max(500_000),
});

const withdrawSchema = z.object({
  amount: z.number().positive().max(500_000),
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
    const { userId } = context as unknown as SupabaseFnContext;
    const service = getServiceClient();

    // 1. Criar o intent no banco (status: pending)
    const { data: intent, error: intentErr } = await service
      .from("payment_intents")
      .insert({ user_id: userId, type: "deposit", amount: data.amount, status: "pending" })
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

    // 3. Atualizar intent com dados do provider
    await service
      .from("payment_intents")
      .update({
        provider_id: charge.id,
        qr_code: charge.qr_code,
        qr_code_img: charge.qr_code_base64,
        expires_at: charge.expiration,
        status: "pending",
        meta: charge as unknown as Record<string, unknown>,
      })
      .eq("id", intent.id);

    return {
      intentId: intent.id,
      qrCode: charge.qr_code,
      qrCodeImg: charge.qr_code_base64,
      expiresAt: charge.expiration,
    };
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
    const { supabase } = context as unknown as SupabaseFnContext;

    // RPC cria o intent + reserva o saldo + aplica KYC gate
    const { data: result, error } = await supabase.rpc("request_withdrawal", {
      p_amount: data.amount,
      p_pix_key: data.pixKey,
    });

    if (error) throw new Error(error.message);

    return result as { intent_id: string; balance: number };
  });

/**
 * Busca o status do último intent de depósito pendente do usuário.
 * Usado para polling enquanto o QR Code está sendo exibido.
 */
export const getDepositStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ intentId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as SupabaseFnContext;
    const service = getServiceClient();

    const { data: intent, error } = await service
      .from("payment_intents")
      .select("id, status, amount, created_at, expires_at")
      .eq("id", data.intentId)
      .eq("user_id", userId)
      .single();

    if (error || !intent) throw new Error("Intent não encontrado");

    return intent as {
      id: string;
      status: "pending" | "paid" | "failed" | "expired";
      amount: number;
      created_at: string;
      expires_at: string | null;
    };
  });
