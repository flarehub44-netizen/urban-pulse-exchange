import { getRequest } from "@tanstack/react-start/server";
import { getServiceClient } from "@/lib/supabase-service.server";

export type VelocityAction = "signup" | "deposit" | "withdraw" | "login";

const DEVICE_HEADER = "x-viax-device-id";

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function velocitySecret(): string | null {
  const secret = process.env.VELOCITY_HMAC_SECRET ?? process.env.CRON_HMAC_SECRET ?? "";
  return secret.length >= 16 ? secret : null;
}

export async function hashVelocityValue(value: string): Promise<string | null> {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const secret = velocitySecret();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Velocity] VELOCITY_HMAC_SECRET not configured");
      return null;
    }
    return `dev:${trimmed.slice(0, 8)}`;
  }
  return hmacSha256Hex(secret, trimmed);
}

export function readVelocityContext(): {
  ip: string;
  deviceId: string | null;
  cfRay: string | null;
} {
  const request = getRequest();
  const headers = request?.headers;
  return {
    ip: headers?.get("cf-connecting-ip") ?? headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    deviceId: headers?.get(DEVICE_HEADER),
    cfRay: headers?.get("cf-ray"),
  };
}

type VelocityLimitResult = {
  limited?: boolean;
  retry_after_seconds?: number;
};

/**
 * Records audit event and enforces IP velocity. Throws on limit in production paths.
 */
export async function assertActionVelocity(
  action: VelocityAction,
  userId?: string | null,
  deviceIdFromClient?: string | null,
): Promise<void> {
  const { ip, deviceId: deviceHeader, cfRay } = readVelocityContext();
  const deviceId = deviceIdFromClient ?? deviceHeader;
  const ipHash = await hashVelocityValue(ip);
  const deviceHash = deviceId ? await hashVelocityValue(`device:${deviceId}`) : null;

  if (!ipHash) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Serviço temporariamente indisponível. Tente novamente em instantes.");
    }
    return;
  }

  let service: ReturnType<typeof getServiceClient>;
  try {
    service = getServiceClient();
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Serviço temporariamente indisponível. Tente novamente em instantes.");
    }
    return;
  }

  await service.rpc("service_record_velocity_event", {
    p_action: action,
    p_user_id: userId ?? undefined,
    p_ip_hash: ipHash,
    p_device_hash: deviceHash ?? undefined,
    p_meta: { cf_ray: cfRay },
  });

  const { data, error } = await service.rpc("service_assert_velocity_limit", {
    p_action: action,
    p_ip_hash: ipHash,
    p_device_hash: deviceHash ?? undefined,
  });

  if (error) {
    console.error("[Velocity] limit check failed", { action, error: error.message });
    if (process.env.NODE_ENV === "production") {
      throw new Error("Serviço temporariamente indisponível. Tente novamente em instantes.");
    }
    return;
  }

  const result = (data ?? {}) as VelocityLimitResult;
  if (result.limited) {
    if (userId) {
      try {
        await service.rpc("record_user_risk_alert", {
          p_user_id: userId,
          p_alert_type: "velocity_ip_exceeded",
          p_detail: `Limite de ${action} por IP excedido.`,
          p_meta: { action, ip_hash_prefix: ipHash.slice(0, 8) },
        });
      } catch {
        // ignore alert failures
      }
    }

    throw new Error(
      "Muitas tentativas a partir desta rede. Aguarde algumas horas ou entre em contato com o suporte.",
    );
  }
}

export { DEVICE_HEADER };
