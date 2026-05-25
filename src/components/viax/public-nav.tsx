import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/viax/sidebar";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { useAuthPublic } from "@/hooks/use-auth-public";
import { copy } from "@/copy/pt-BR";

type PublicNavProps = {
  /** Landing uses terminal CTA; public shell uses deposit-first. */
  variant?: "landing" | "shell";
};

export function PublicNav({ variant = "shell" }: PublicNavProps) {
  const { isRegistered } = useAuthPublic();
  const { openDeposit } = useDepositSheet();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <Logo />
          <span className="font-semibold tracking-tight">ViaX</span>
        </Link>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/markets" className="hover:text-foreground">
            Mercados
          </Link>
          <Link to="/live" className="hover:text-foreground">
            Mapa
          </Link>
          <Link
            to="/ranking"
            search={{ auth: "signup", deposit: "1" }}
            className="hover:text-foreground"
          >
            Ranking
          </Link>
          <Link to="/urbanmind" className="hover:text-foreground">
            UrbanMind
          </Link>
          {variant === "landing" && (
            <Link to="/feed" className="hover:text-foreground">
              Feed
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {variant === "shell" && (
            <AuthModalTrigger
              mode="login"
              className="rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-surface"
            >
              {copy.auth.loginCta}
            </AuthModalTrigger>
          )}
          {variant === "shell" ? (
            isRegistered ? (
              <button
                type="button"
                onClick={() => openDeposit({ amount: 200, source: "public_nav" })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {copy.auth.depositAndPlayCta} <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <AuthModalTrigger
                mode="signup"
                depositAfter
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {copy.auth.depositAndPlayCta} <ArrowRight className="size-3.5" />
              </AuthModalTrigger>
            )
          ) : (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {copy.landing.ctaTerminal} <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
