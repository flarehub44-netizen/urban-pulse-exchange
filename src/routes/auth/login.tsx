import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { signInWithEmail } from "@/lib/auth-actions";
import { requireGuestOnly } from "@/lib/auth-guards";
import { copy } from "@/copy/pt-BR";

export type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/auth/login")({
  beforeLoad: () => requireGuestOnly(),
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      toast.success(copy.auth.loginSuccess);
      navigate({ to: redirect ?? "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={copy.auth.loginTitle}
      subtitle={copy.auth.loginSubtitle}
      footer={
        <>
          {copy.auth.noAccount}{" "}
          <Link to="/auth/signup" className="text-primary hover:underline">
            {copy.auth.signupLink}
          </Link>
        </>
      }
    >
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
        <label className="block text-sm">
          <span className="text-muted-foreground">{copy.auth.passwordLabel}</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2"
          />
        </label>
        <Link
          to="/auth/forgot-password"
          className="block text-xs text-primary hover:underline"
        >
          {copy.auth.forgotPassword}
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? copy.auth.loading : copy.auth.loginCta}
        </button>
      </form>
    </AuthShell>
  );
}
