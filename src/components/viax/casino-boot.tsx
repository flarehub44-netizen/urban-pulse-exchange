import { toast } from "sonner";
import { copy } from "@/copy/pt-BR";
import { useAuth } from "@/hooks/use-auth";
import { useCasinoEnabled } from "@/hooks/use-casino-enabled";
import { useCasinoQuickDeposit } from "@/hooks/use-casino-spin";
import { useNearMissAlerts } from "@/hooks/use-near-miss-alerts";
import { NearMissModal } from "@/components/viax/near-miss-modal";
import { setLastImpulseAmount } from "@/lib/impulse-deposit";
import { formatBRL } from "@/lib/parimutuel";

export function CasinoBoot() {
  const { userId } = useAuth();
  const { enabled } = useCasinoEnabled();
  const { open, close, payload } = useNearMissAlerts(userId);
  const { mutateAsync: quickDeposit, isPending } = useCasinoQuickDeposit();

  if (!enabled) return null;

  const onQuickDeposit = async (amount: number) => {
    try {
      const res = await quickDeposit({ amount, context: "after_loss" });
      setLastImpulseAmount(amount);
      toast.success(copy.casino.depositSuccess(formatBRL(res.balance)));
      close();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : copy.errors.generic);
    }
  };

  return (
    <NearMissModal
      open={open}
      onClose={close}
      payload={payload}
      onQuickDeposit={onQuickDeposit}
      depositPending={isPending}
    />
  );
}
