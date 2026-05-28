import { copy } from "@/copy/pt-BR";

/** PostgREST 403 when authenticated role lacks EXECUTE on the RPC (not "user is not admin"). */
export function isAdminRpcForbiddenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; status?: number };
  if (e.status === 403) return true;
  if (e.code === "42501") return true;
  const msg = String(e.message ?? "").toLowerCase();
  return (
    msg.includes("permission denied for function") ||
    msg.includes("permission denied to execute") ||
    (msg.includes("permission denied") && msg.includes("function"))
  );
}

/** PostgREST 404 / PGRST202 when CPA RPCs were never applied on the remote database. */
export function isCpaRiskRpcMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; status?: number };
  if (e.code === "PGRST202") return true;
  if (e.status === 404) return true;
  const msg = String(e.message ?? "").toLowerCase();
  return (
    msg.includes("pgrst202") ||
    msg.includes("could not find the function") ||
    msg.includes("not found")
  );
}

export function getAdminRpcErrorMessage(error: unknown, fallback?: string): string {
  if (isCpaRiskRpcMissingError(error)) {
    return copy.admin.risk.cpaRpcNotInstalled;
  }
  if (isAdminRpcForbiddenError(error)) {
    return copy.admin.rpcExecuteForbidden;
  }
  return fallback ?? (error instanceof Error ? error.message : copy.errors.loadFailed);
}
