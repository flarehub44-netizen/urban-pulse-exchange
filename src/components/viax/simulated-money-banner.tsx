import { Info } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { isPixPaymentsEnabled } from "@/lib/pix-payments";
import { isPartnerPayoutsReal } from "@/lib/partner-payouts";
import { cn } from "@/lib/utils";

type PaymentInfoBannerProps = {
  className?: string;
  /** casino = roleta/recarga rápida; partner = payouts afiliado; wallet = depósito Pix */
  context?: "wallet" | "casino" | "partner";
};

export function PaymentInfoBanner({ className, context = "wallet" }: PaymentInfoBannerProps) {
  const pix = isPixPaymentsEnabled();
  const title =
    context === "casino"
      ? copy.wallet.simulatedTitle
      : context === "partner"
        ? "Saques de afiliado"
        : copy.wallet.pixTitle;
  const note =
    context === "casino"
      ? copy.wallet.simulatedDepositNote
      : context === "partner"
        ? copy.partner.simulatedPayout
        : copy.wallet.pixDepositNote;

  if (context === "partner" && !isPartnerPayoutsReal()) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl border border-warn/25 bg-warn/5 px-3 py-2.5 text-xs",
          className,
        )}
        role="note"
      >
        <Info className="mt-0.5 size-3.5 shrink-0 text-warn" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{copy.partner.payoutSimulatedTitle}</span>
          {" — "}
          {copy.partner.simulatedPayout}
        </p>
      </div>
    );
  }

  if (context === "wallet" && !pix) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl border border-warn/25 bg-warn/5 px-3 py-2.5 text-xs",
          className,
        )}
        role="note"
      >
        <Info className="mt-0.5 size-3.5 shrink-0 text-warn" />
        <p className="text-muted-foreground">
          Depósitos Pix indisponíveis neste ambiente. Configure SyncPay para habilitar pagamentos
          reais.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs",
        className,
      )}
      role="note"
    >
      <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{title}</span>
        {context !== "partner" && (
          <>
            {" — "}
            {note}
          </>
        )}
      </p>
    </div>
  );
}

/** @deprecated Use PaymentInfoBanner */
export function SimulatedMoneyBanner(props: { className?: string }) {
  return <PaymentInfoBanner {...props} context="casino" />;
}
