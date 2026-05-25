import { Link } from "@tanstack/react-router";
import { Flag, MapPin, Trophy, Wallet } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { useAuthPublic } from "@/hooks/use-auth-public";
import { cn } from "@/lib/utils";

export function PublicMobileNav() {
  const { isRegistered } = useAuthPublic();
  const { openDeposit } = useDepositSheet();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação pública"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
        <Link
          to="/markets"
          search={{ status: "live" }}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] text-muted-foreground",
            "hover:bg-surface/60 hover:text-foreground",
          )}
        >
          <Trophy className="size-4" />
          Mercados
        </Link>
        <Link
          to="/markets"
          search={{ segment: "futebol" }}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] text-muted-foreground",
            "hover:bg-surface/60 hover:text-foreground",
          )}
        >
          <Flag className="size-4" />
          {copy.nav.football}
        </Link>
        <Link
          to="/live"
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] text-muted-foreground",
            "hover:bg-surface/60 hover:text-foreground",
          )}
        >
          <MapPin className="size-4" />
          Mapa
        </Link>
        {isRegistered ? (
          <button
            type="button"
            onClick={() => openDeposit({ amount: 200, source: "public_mobile_nav" })}
            className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-medium text-primary hover:bg-primary/10"
          >
            <Wallet className="size-4" />
            Depositar
          </button>
        ) : (
          <AuthModalTrigger
            mode="signup"
            depositAfter
            className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-medium text-primary hover:bg-primary/10"
          >
            <Wallet className="size-4" />
            Depositar
          </AuthModalTrigger>
        )}
      </div>
    </nav>
  );
}
