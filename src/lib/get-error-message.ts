import { copy } from "@/copy/pt-BR";

/** Extracts a user-facing message from server-fn / mutation errors (not always `instanceof Error`). */
export function getErrorMessage(error: unknown, fallback: string = copy.errors.generic): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    if (record.error && typeof record.error === "object") {
      const nested = record.error as Record<string, unknown>;
      if (typeof nested.message === "string" && nested.message.trim()) {
        return nested.message;
      }
    }
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}
