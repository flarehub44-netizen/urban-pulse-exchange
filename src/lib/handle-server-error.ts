import { toast } from "sonner";
import { copy } from "@/copy/pt-BR";

/**
 * Normaliza erros de server actions para toast ao usuário.
 * Trata rate-limit (429), erros de negócio tipados e erros genéricos.
 */
export function handleServerError(err: unknown, fallback?: string): void {
  if (err instanceof Response) {
    if (err.status === 429) {
      toast.error(copy.errors.rateLimited);
      return;
    }
    if (err.status === 401) {
      toast.error(copy.errors.unauthorized);
      return;
    }
  }

  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : undefined;

  if (message?.toLowerCase().includes("registration_required")) {
    toast.error(copy.errors.registrationRequired);
    return;
  }

  if (message?.toLowerCase().includes("insufficient") || message?.toLowerCase().includes("saldo")) {
    toast.error(copy.errors.insufficientBalance);
    return;
  }

  toast.error(fallback ?? message ?? copy.errors.generic);
}
