import { Link } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { Logo } from "@/components/viax/sidebar";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { useAuthPublic } from "@/hooks/use-auth-public";
import { copy } from "@/copy/pt-BR";
import { MARKET_VERTICALS } from "@/lib/catalog-market";

type PublicNavProps = {
  /** Landing uses terminal CTA; public shell uses deposit-first. */
  variant?: "landing" | "shell";
};

export function PublicNav({ variant = "shell" }: PublicNavProps) {
  const { isRegistered } = useAuthPublic();
  const { openDeposit } = useDepositSheet();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <Logo />
          <span className="font-semibold tracking-tight">ViaX</span>
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-muted-foreground lg:flex">
          <Link
            to="/v/$vertical"
            params={{ vertical: "transito" }}
            preload="intent"
            className="hover:text-foreground"
          >
            {copy.markets.transitoTab}
          </Link>
          <Link to="/copa" className="hover:text-foreground">
            Copa 2026
          </Link>
          {MARKET_VERTICALS.filter((v) => !["transito", "copa", "comunidade"].includes(v.slug)).slice(0, 4).map((v) => (
            <Link
              key={v.slug}
              to={v.slug === "copa" ? "/copa" : "/v/$vertical"}
              params={v.slug === "copa" ? undefined : { vertical: v.slug }}
              className="hover:text-foreground"
            >
              {v.label}
            </Link>
          ))}
          <Link to="/live" className="hover:text-foreground">
            Mapa
          </Link>
          <Link
            to="/v/$vertical"
            params={{ vertical: "crypto" }}
            search={{ q: "" }}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 px-2.5 py-1 text-xs hover:bg-muted/50"
          >
            <Search className="size-3.5" />
            Buscar
          </Link>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!isRegistered && (
            <AuthModalTrigger
              mode="login"
              className="whitespace-nowrap rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-surface sm:px-3 sm:py-2 sm:text-sm"
            >
              {copy.auth.loginCta}
            </AuthModalTrigger>
          )}
          {isRegistered ? (
            <button
              type="button"
              onClick={() => openDeposit({ amount: 200, source: "public_nav" })}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-sm"
            >
              {copy.auth.depositAndPlayCta} <ArrowRight className="size-3.5" />
            </button>
          ) : variant === "landing" ? (
            <AuthModalTrigger
              mode="signup"
              depositAfter
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-sm"
            >
              {copy.auth.registerCta} <ArrowRight className="size-3.5" />
            </AuthModalTrigger>
          ) : (
            <AuthModalTrigger
              mode="signup"
              depositAfter
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-sm"
            >
              {copy.auth.depositAndPlayCta} <ArrowRight className="size-3.5" />
            </AuthModalTrigger>
          )}
        </div>
      </div>
    </header>
  );
}
