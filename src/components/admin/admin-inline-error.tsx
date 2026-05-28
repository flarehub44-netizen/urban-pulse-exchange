import { InlineError } from "@/components/viax/inline-error";
import { getAdminRpcErrorMessage } from "@/lib/admin-rpc-errors";

type AdminInlineErrorProps = {
  error?: unknown;
  onRetry?: () => void;
};

/** Admin panel error with 403 RPC grant vs missing migration hints. */
export function AdminInlineError({ error, onRetry }: AdminInlineErrorProps) {
  return <InlineError message={getAdminRpcErrorMessage(error)} onRetry={onRetry} />;
}
