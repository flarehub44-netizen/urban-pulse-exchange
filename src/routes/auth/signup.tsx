import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { signUpWithEmail } from "@/lib/auth-actions";
import { copy } from "@/copy/pt-BR";

export type SignupSearch = { upgrade?: string };

export const Route = createFileRoute("/auth/signup")({
  validateSearch: (s: Record<string, unknown>): SignupSearch => ({
    upgrade: typeof s.upgrade === "string" ? s.upgrade : undefined,
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { upgrade } = Route.useSearch();
  const isUpgrade = upgrade === "1";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error(copy.auth.nameMin);
      return;
    }
    setLoading(true);
    try {
      const result = await signUpWithEmail(email, password, name);
      if (result.needsEmailConfirmation) {
        toast.success(copy.auth.verifySent);
        navigate({ to: "/auth/verify" });
      } else {
        toast.success(copy.auth.signupSuccess);
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={isUpgrade ? copy.auth.upgradeTitle : copy.auth.signupTitle}
      subtitle={isUpgrade ? copy.auth.upgradeSubtitle : copy.auth.signupSubtitle}
      footer={
        <>
          {copy.auth.hasAccount}{" "}
          <Link to="/auth/login" className="text-primary hover:underline">
            {copy.auth.loginLink}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-muted-foreground">{copy.auth.nameLabel}</span>
          <input
            type="text"
            required
            minLength={2}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2"
          />
        </label>
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? copy.auth.loading : copy.auth.signupCta}
        </button>
      </form>
    </AuthShell>
  );
}
