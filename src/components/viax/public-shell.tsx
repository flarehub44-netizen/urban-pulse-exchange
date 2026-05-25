import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/viax/sidebar";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { copy } from "@/copy/pt-BR";

type PublicShellProps = {
  children: ReactNode;
};

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-background">
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
            <Link to="/ranking" className="hover:text-foreground">
              Ranking
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <AuthModalTrigger
              mode="login"
              className="rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-surface"
            >
              {copy.auth.loginCta}
            </AuthModalTrigger>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {copy.landing.ctaTerminal} <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">{children}</main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Voltar ao início
        </Link>
      </footer>
    </div>
  );
}
