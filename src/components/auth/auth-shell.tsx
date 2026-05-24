import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "@/components/viax/sidebar";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <div className="w-full max-w-md rounded-2xl border bg-card/80 p-6 shadow-lg backdrop-blur">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 border-t pt-4 text-center text-sm">{footer}</div>}
      </div>
    </div>
  );
}
