import { Link } from "@tanstack/react-router";
import { Flag, LogIn, Radio, Sparkles, Trophy, UserPlus } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { CatalogPublicSearch } from "@/components/catalog/catalog-public-search";
import { useAuthPublic } from "@/hooks/use-auth-public";
import { cn } from "@/lib/utils";

const linkClass =
  "flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] text-muted-foreground hover:bg-surface/60 hover:text-foreground [&>span]:max-w-full [&>span]:truncate";

export function PublicMobileNav() {
  const { isRegistered } = useAuthPublic();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação pública"
    >
      <div className="mx-auto grid max-w-lg grid-cols-6 gap-0.5 px-1 py-2">
        <Link to="/" className={cn(linkClass)}>
          <Radio className="size-4" />
          <span>Início</span>
        </Link>
        <Link to="/v/$vertical" params={{ vertical: "transito" }} className={cn(linkClass)}>
          <Sparkles className="size-4" />
          {copy.markets.transitoTab}
        </Link>
        <Link to="/copa" className={cn(linkClass)}>
          <Trophy className="size-4" />
          Copa
        </Link>
        <Link to="/v/$vertical" params={{ vertical: "crypto" }} className={cn(linkClass)}>
          <Flag className="size-4" />
          Crypto
        </Link>
        <div className={cn(linkClass, "border-0 bg-transparent p-0")}>
          <CatalogPublicSearch variant="icon" className="mx-auto" />
          <span>Buscar</span>
        </div>
        {!isRegistered ? (
          <AuthModalTrigger
            mode="signup"
            depositAfter
            className={cn(linkClass, "font-medium text-primary hover:bg-primary/10")}
          >
            <UserPlus className="size-4" />
            {copy.auth.registerCta}
          </AuthModalTrigger>
        ) : (
          <Link to="/dashboard" className={cn(linkClass, "font-medium text-primary")}>
            <LogIn className="size-4" />
            {copy.landing.ctaTerminal}
          </Link>
        )}
      </div>
    </nav>
  );
}
