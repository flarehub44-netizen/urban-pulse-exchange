import { Link } from "@tanstack/react-router";
import { copy } from "@/copy/pt-BR";

export function RegisterRequiredCta({ className }: { className?: string }) {
  return (
    <div className={className ?? "surface-card mx-auto max-w-md space-y-3 p-4 text-center"}>
      <p className="text-sm text-warn">{copy.auth.registerRequired}</p>
      <p className="text-xs text-muted-foreground">{copy.auth.walletRegisterHint}</p>
      <Link
        to="/auth/signup"
        search={{ upgrade: "1" }}
        className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        {copy.auth.registerCta}
      </Link>
    </div>
  );
}
