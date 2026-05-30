import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/viax/public-nav";
import { PublicMobileNav } from "@/components/viax/public-mobile-nav";

type PublicShellProps = {
  children: ReactNode;
};

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-20 md:pb-0">
      <PublicNav variant="shell" />

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">{children}</main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Voltar ao início
        </Link>
      </footer>

      <PublicMobileNav />
    </div>
  );
}
