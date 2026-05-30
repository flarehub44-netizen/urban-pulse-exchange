import { useState } from "react";
import { toast } from "sonner";
import { signUpWithEmail } from "@/lib/auth-actions";
import { runPostRegistrationFlow } from "@/lib/post-registration";
import { copy } from "@/copy/pt-BR";

type SignupFormProps = {
  onSuccess: () => void;
  onNeedsVerify: () => void;
};

export function SignupForm({ onSuccess, onNeedsVerify }: SignupFormProps) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizeDigits = (value: string) => value.replace(/\D/g, "");

  const isValidCpf = (value: string) => {
    const digits = normalizeDigits(value);
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;

    const calcCheckDigit = (base: string, factorStart: number) => {
      let sum = 0;
      for (let i = 0; i < base.length; i += 1) {
        sum += Number(base[i]) * (factorStart - i);
      }
      const rest = (sum * 10) % 11;
      return rest === 10 ? 0 : rest;
    };

    const d1 = calcCheckDigit(digits.slice(0, 9), 10);
    const d2 = calcCheckDigit(digits.slice(0, 10), 11);
    return d1 === Number(digits[9]) && d2 === Number(digits[10]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error(copy.auth.nameMin);
      return;
    }
    const handleTrim = handle.trim().replace(/^@+/, "");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(handleTrim)) {
      toast.error(copy.auth.handleInvalid);
      return;
    }
    if (!isValidCpf(cpf)) {
      toast.error(copy.auth.cpfInvalid);
      return;
    }
    const phoneDigits = normalizeDigits(phone);
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error(copy.auth.phoneInvalid);
      return;
    }
    setLoading(true);
    try {
      const result = await signUpWithEmail(
        email,
        password,
        name,
        normalizeDigits(cpf),
        phoneDigits,
      );
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
      <label className="block text-sm">
        <span className="text-muted-foreground">{copy.auth.cpfLabel}</span>
        <input
          type="text"
          required
          autoComplete="off"
          inputMode="numeric"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          className="mt-1 w-full rounded-lg border bg-surface px-3 py-2"
          placeholder="000.000.000-00"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">{copy.auth.phoneLabel}</span>
        <input
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border bg-surface px-3 py-2"
          placeholder="(11) 99999-9999"
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
