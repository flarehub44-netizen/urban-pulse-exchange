import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { sendPasswordReset } from "@/lib/auth-actions";
import { requireGuestOnly } from "@/lib/auth-guards";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/auth/forgot-password")({
  beforeLoad: () => requireGuestOnly(),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
      toast.success(copy.auth.resetSent);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={copy.auth.forgotTitle}
      subtitle={copy.auth.forgotSubtitle}
      footer={
        <Link to="/auth/login" className="text-primary hover:underline">
          {copy.auth.backToLogin}
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-muted-foreground">{copy.auth.resetSent}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-muted-foreground">{copy.auth.emailLabel}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? copy.auth.loading : copy.auth.resetCta}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
