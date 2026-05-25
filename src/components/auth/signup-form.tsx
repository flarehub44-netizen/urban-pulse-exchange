import { useState } from "react";
import { toast } from "sonner";
import { signUpWithEmail } from "@/lib/auth-actions";
import { runPostRegistrationFlow } from "@/lib/post-registration";
import { copy } from "@/copy/pt-BR";

type SignupFormProps = {
  isUpgrade?: boolean;
  onSuccess: () => void;
  onNeedsVerify: () => void;
};

export function SignupForm({ isUpgrade, onSuccess, onNeedsVerify }: SignupFormProps) {
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
        onNeedsVerify();
      } else {
        await runPostRegistrationFlow(name.trim());
        toast.success(copy.auth.signupSuccess);
        onSuccess();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
}
