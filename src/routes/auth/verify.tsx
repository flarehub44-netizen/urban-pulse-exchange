import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/auth-shell";
import { requireGuestOnly } from "@/lib/auth-guards";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/auth/verify")({
  beforeLoad: () => requireGuestOnly(),
  component: VerifyPage,
});

function VerifyPage() {
  return (
    <AuthShell
      title={copy.auth.verifyTitle}
      subtitle={copy.auth.verifySubtitle}
      footer={
        <Link to="/auth/login" className="text-primary hover:underline">
          {copy.auth.backToLogin}
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground">{copy.auth.verifyHint}</p>
    </AuthShell>
  );
}
