import { AlertCircle, RefreshCw } from "lucide-react";

interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function InlineError({ message = "Erro ao carregar dados", onRetry }: InlineErrorProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <AlertCircle className="size-7 text-destructive/70" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
        >
          <RefreshCw className="size-3.5" /> Tentar novamente
        </button>
      )}
    </div>
  );
}
