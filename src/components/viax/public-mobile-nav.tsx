import { Link } from "@tanstack/react-router";
import { Flag, Map, Sparkles, Wallet } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { useAuthPublic } from "@/hooks/use-auth-public";
import { cn } from "@/lib/utils";

const linkClass =
  "flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-2 text-[10px] text-muted-foreground hover:bg-surface/60 hover:text-foreground";

export function PublicMobileNav() {
  const { isRegistered } = useAuthPublic();
  const { openDeposit } = useDepositSheet();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação pública"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 py-2">
        <Link to="/markets" search={{ segment: "transito" }} className={cn(linkClass)}>
          <Map className="size-4" />
          {copy.markets.transitoTab}
        </Link>
        <Link to="/markets" search={{ segment: "futebol" }} className={cn(linkClass)}>
          <Flag className="size-4" />
          {copy.markets.futebolTab}
        </Link>
        <Link to="/markets" search={{ segment: "outros" }} className={cn(linkClass)}>
          <Sparkles className="size-4" />
          {copy.markets.outrosTab}
        </Link>
        {isRegistered ? (
          <button
            type="button"
            onClick={() => openDeposit({ amount: 200, source: "public_mobile_nav" })}
            className={cn(linkClass, "font-medium text-primary hover:bg-primary/10")}
          >
            <Wallet className="size-4" />
            Depositar
          </button>
        ) : (
          <AuthModalTrigger
            mode="signup"
            depositAfter
            className={cn(linkClass, "font-medium text-primary hover:bg-primary/10")}
          >
            <Wallet className="size-4" />
            Depositar
          </AuthModalTrigger>
        )}
        <Link to="/dashboard" className={cn(linkClass)}>
          <span className="flex size-4 items-center justify-center rounded bg-primary/20 text-[9px] font-bold text-primary">
            V
          </span>
          App
        </Link>
      </div>
    </nav>
  );
}
