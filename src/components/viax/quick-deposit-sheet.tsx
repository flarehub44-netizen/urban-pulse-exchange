import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, QrCode, Clock, Wallet, Gift } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { initiateDepositFn, getDepositStatusFn } from "@/actions/payments";
import { ImpulseDepositChips } from "@/components/viax/impulse-deposit-bar";

import { useCasinoEnabled } from "@/hooks/use-casino-enabled";
import { formatBRL } from "@/lib/parimutuel";
import { useAuth } from "@/hooks/use-auth";
import { useHasDeposited } from "@/hooks/use-has-deposited";
import { RegisterRequiredCta } from "@/components/auth/register-required-cta";
import { trackDepositFunnel } from "@/lib/deposit-funnel";
import { getLastImpulseAmount, setLastImpulseAmount } from "@/lib/impulse-deposit";
import { getStoredPartnerRef } from "@/lib/partner-attribution";
import { copy } from "@/copy/pt-BR";
import { invalidateWalletQueries } from "@/lib/query-invalidation";

interface QuickDepositSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedAmount?: number;
}

export function QuickDepositSheet({
  open,
  onOpenChange,
  suggestedAmount = 200,
}: QuickDepositSheetProps) {
  const queryClient = useQueryClient();
  const { isRegistered, userId } = useAuth();
  const { data: hasDeposited } = useHasDeposited(userId);
  const { enabled: casinoEnabled } = useCasinoEnabled();
  const [amount, setAmount] = useState(String(suggestedAmount));
  const [qr, setQr] = useState<{
    qrCode: string;
    qrCodeImg: string;
    intentId: string;
    expiresAt: string;
  } | null>(null);
  const [done, setDone] = useState(false);
  const pollErrors = useRef(0);

  const depositMut = useMutation({
    mutationFn: (amt: number) => initiateDepositFn({ data: { amount: amt } }),
    onSuccess: (res) => {
      trackDepositFunnel("deposit_qr_shown");
      setQr({
        qrCode: res.qrCode,
        qrCodeImg: res.qrCodeImg,
        intentId: res.intentId,
        expiresAt: res.expiresAt,
      });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Depósito falhou."),
  });

  // Poll for payment confirmation while QR is shown
  useEffect(() => {
    if (!qr || done) return;
    pollErrors.current = 0;
    const id = setInterval(async () => {
      try {
        const status = await getDepositStatusFn({ data: { intentId: qr.intentId } });
        if (status.status === "paid") {
          trackDepositFunnel("deposit_paid", { amount: status.amount });
          setDone(true);
          setQr(null);
          invalidateWalletQueries(queryClient);
          queryClient.invalidateQueries({ queryKey: ["has-deposited"] });
          toast.success("Depósito confirmado!", {
            description: `${formatBRL(status.amount)} adicionado ao seu saldo.`,
          });
          onOpenChange(false);
        } else if (status.status === "failed" || status.status === "expired") {
          const retryAmount = getLastImpulseAmount();
          setQr(null);
          setAmount(String(retryAmount));
          toast.error("QR Code expirado. Gere um novo código com o mesmo valor.", {
            action: {
              label: "Tentar de novo",
              onClick: () => depositMut.mutate(retryAmount),
            },
          });
        }
      } catch {
        pollErrors.current += 1;
        if (pollErrors.current >= 3) {
          clearInterval(id);
          toast.error(copy.errors.depositPollFailed);
        }
      }
    }, 5000);
    return () => clearInterval(id);
  }, [qr, done, queryClient, onOpenChange, depositMut]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setQr(null);
      setDone(false);
    }
  }, [open]);

  const handleGenerate = () => {
    const amt = Number(amount);
    if (!amt || amt < 1) {
      toast.error("Informe um valor válido.");
      return;
    }
    setLastImpulseAmount(amt);
    depositMut.mutate(amt);
  };

  const partnerRef = getStoredPartnerRef();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8" data-testid="quick-deposit-sheet">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" />
            Adicionar <span className="text-primary ml-1">saldo</span>
          </SheetTitle>
        </SheetHeader>

        {!isRegistered ? (
          <RegisterRequiredCta className="space-y-3 p-2 text-center" />
        ) : qr ? (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>Escaneie o QR Code no app do seu banco</span>
            </div>
            {qr.qrCodeImg ? (
              <img
                src={`data:image/png;base64,${qr.qrCodeImg}`}
                alt="QR Code Pix"
                className="mx-auto size-48 rounded-xl border"
              />
            ) : (
              <div className="mx-auto flex size-48 items-center justify-center rounded-xl border bg-surface-2">
                <QrCode className="size-16 text-muted-foreground" />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(qr.qrCode);
                toast.success("Código Pix copiado!");
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-surface px-3 py-2 text-xs hover:bg-surface-2"
            >
              <Copy className="size-3" /> Pix Copia e Cola
            </button>
            <p className="text-[11px] text-muted-foreground">
              Aguardando confirmação… O saldo será atualizado automaticamente.
            </p>
            <button
              type="button"
              onClick={() => setQr(null)}
              className="text-xs text-muted-foreground underline"
            >
              Cancelar e gerar novo código
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {hasDeposited === false && (
              <div className="flex items-start gap-2 rounded-xl border border-up/30 bg-up/8 px-3 py-2.5">
                <Gift className="size-4 shrink-0 text-up mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-up">Bônus de primeiro depósito</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Deposite R$ 200 ou mais e ganhe <span className="font-medium text-foreground">+10% de bônus</span> (até R$ 50).
                  </p>
                </div>
              </div>
            )}
            {partnerRef?.slug && (
              <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-center text-[11px] text-muted-foreground">
                {copy.depositFunnel.referredBy}{" "}
                <span className="font-medium text-foreground">{partnerRef.slug}</span>
              </p>
            )}
            {casinoEnabled && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Valor sugerido</p>
                <ImpulseDepositChips
                  disabled={depositMut.isPending}
                  onSelect={(amt) => {
                    setAmount(String(amt));
                    setLastImpulseAmount(amt);
                  }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground">
                Valor (BRL)
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border bg-surface px-3 py-2">
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent mono text-lg outline-none"
                />
                <span className="shrink-0 text-sm text-muted-foreground">BRL</span>
              </div>
            </div>

            <button
              type="button"
              disabled={depositMut.isPending}
              onClick={handleGenerate}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-60 hover:opacity-90 transition"
            >
              {depositMut.isPending
                ? "Gerando QR Code…"
                : `Gerar QR Code Pix · ${formatBRL(Number(amount) || 0)}`}
            </button>

            <p className="text-center text-[11px] text-muted-foreground">
              Pagamento via Pix · Crédito imediato após confirmação
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
