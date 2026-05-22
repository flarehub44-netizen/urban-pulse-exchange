import { useMemo } from "react";
import { Flame, Snowflake, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/copy/pt-BR";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { useTodayCheckIn } from "@/hooks/use-daily-check-in";
import { useStreakFreezeFn as streakFreezeFn, buyStreakFreezeFn } from "@/actions/retention";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function StreakRiskBanner() {
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const { data: today } = useTodayCheckIn(userId);
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["me", userId] });
    queryClient.invalidateQueries({ queryKey: ["daily-check-in", userId] });
  };

  const { mutateAsync: freeze, isPending: freezePending } = useMutation({
    mutationFn: () => streakFreezeFn({}),
    onSuccess: invalidate,
  });

  const { mutateAsync: buyFreeze, isPending: buyPending } = useMutation({
    mutationFn: () => buyStreakFreezeFn(),
    onSuccess: invalidate,
  });

  const show = useMemo(() => {
    if (!profile || profile.streak < 2 || today) return false;
    const h = new Date().getHours();
    return h >= 18;
  }, [profile, today]);

  if (!show) return null;

  const freezesLeft = profile?.streakFreezesLeft ?? 0;
  const xp = profile?.xp ?? 0;
  const canBuy = xp >= 200;

  return (
    <div className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-warn" />
          <span>{copy.retention.streakAtRisk(profile?.streak ?? 0)}</span>
          {freezesLeft > 0 && (
            <span className="text-xs text-muted-foreground">
              ({freezesLeft} freeze{freezesLeft > 1 ? "s" : ""} disponível)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {freezesLeft > 0 && (
            <button
              type="button"
              disabled={freezePending}
              onClick={async () => {
                try {
                  const res = await freeze();
                  if (res.ok) toast.success(copy.retention.freezeUsed);
                  else toast.message(copy.retention.freezeUnavailable);
                } catch {
                  toast.error(copy.errors.generic);
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-warn/40 px-3 py-1 text-xs hover:bg-warn/15"
            >
              <Snowflake className="size-3" />
              {copy.retention.useFreeze}
            </button>
          )}
          {freezesLeft === 0 && canBuy && (
            <button
              type="button"
              disabled={buyPending}
              onClick={async () => {
                try {
                  const res = await buyFreeze();
                  if (res.ok) toast.success(`Freeze comprado! (${res.freezes_left} disponíveis)`);
                  else toast.message(`XP insuficiente — custo: ${res.cost} XP`);
                } catch {
                  toast.error(copy.errors.generic);
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/15"
            >
              <ShoppingCart className="size-3" />
              Comprar freeze (200 XP)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
