import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { saveProfileCpfFn } from "@/actions/account";
import { copy } from "@/copy/pt-BR";
import { isValidCpf, normalizeCpfDigits } from "@/lib/cpf";
import { getErrorMessage } from "@/lib/get-error-message";

type CpfCaptureFormProps = {
  onSaved: () => void;
  className?: string;
};

/** Inline CPF form for Pix — avoids nesting a second Sheet on top of the deposit sheet. */
export function CpfCaptureForm({ onSaved, className }: CpfCaptureFormProps) {
  const [cpf, setCpf] = useState("");

  const saveMut = useMutation({
    mutationFn: (digits: string) => saveProfileCpfFn({ data: { cpf: digits } }),
    onSuccess: () => {
      toast.success(copy.wallet.cpfSaved);
      setCpf("");
      onSaved();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCpf(cpf)) {
      toast.error(copy.auth.cpfInvalid);
      return;
    }
    saveMut.mutate(normalizeCpfDigits(cpf));
  };

  return (
    <form onSubmit={handleSubmit} className={className ?? "space-y-4"}>
      <div>
        <p className="text-sm font-medium">{copy.wallet.cpfRequiredTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.wallet.cpfRequiredBody}</p>
      </div>
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
      <p className="text-[11px] text-muted-foreground">{copy.wallet.cpfPixHint}</p>
      <button
        type="submit"
        disabled={saveMut.isPending}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {saveMut.isPending ? copy.auth.loading : copy.wallet.cpfSaveContinue}
      </button>
    </form>
  );
}
