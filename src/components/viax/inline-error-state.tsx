import { AlertCircle } from "lucide-react";
import { copy } from "@/copy/pt-BR";

interface InlineErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineErrorState({ message, onRetry, className }: InlineErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground ${className ?? ""}`}
    >
      <AlertCircle className="size-7 text-destructive/60" />
      <p>{message ?? copy.errors.generic}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
