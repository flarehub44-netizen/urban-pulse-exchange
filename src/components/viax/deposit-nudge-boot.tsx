import { useAuth } from "@/hooks/use-auth";
import { useDepositNudge } from "@/hooks/use-deposit-nudge";

export function DepositNudgeBoot() {
  const { userId, isRegistered } = useAuth();
  useDepositNudge(userId, isRegistered);
  return null;
}
