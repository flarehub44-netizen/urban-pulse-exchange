import { DepositPromptBanner } from "@/components/viax/deposit-prompt-banner";
import { useHasDeposited } from "@/hooks/use-has-deposited";
import { useAuth } from "@/hooks/use-auth";

/** Shows deposit CTA for registered users who have not deposited yet. */
export function DepositFunnelBannerSlot() {
  const { userId, isRegistered } = useAuth();
  const { data: hasDeposited } = useHasDeposited(userId);

  if (!isRegistered || hasDeposited !== false) return null;

  return (
    <div className="mb-4">
      <DepositPromptBanner />
    </div>
  );
}
