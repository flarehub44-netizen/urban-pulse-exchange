import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { saveProfileCpfFn } from "@/actions/account";
import { copy } from "@/copy/pt-BR";
import { isValidCpf, normalizeCpfDigits } from "@/lib/cpf";

type CpfCaptureSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function CpfCaptureSheet({ open, onOpenChange, onSaved }: CpfCaptureSheetProps) {
  const [cpf, setCpf] = useState("");

  const saveMut = useMutation({
    mutationFn: (digits: string) => saveProfileCpfFn({ data: { cpf: digits } }),
    onSuccess: () => {
      toast.success(copy.wallet.cpfSaved);
      setCpf("");
      onSaved();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : copy.errors.generic;
      toast.error(msg);
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
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!saveMut.isPending) onOpenChange(next);
      }}
    >
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle>{copy.wallet.cpfRequiredTitle}</SheetTitle>
          <p className="text-xs text-muted-foreground">{copy.wallet.cpfRequiredBody}</p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
      </SheetContent>
    </Sheet>
  );
}
