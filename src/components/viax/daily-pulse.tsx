import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/copy/pt-BR";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useTodayCheckIn, useDailyCheckIn } from "@/hooks/use-daily-check-in";
import { cn } from "@/lib/utils";
import type { AchievementUnlock } from "@/actions/retention";

function showAchievementToasts(items: AchievementUnlock[] | undefined) {
  if (!items?.length) return;
  for (const a of items) {
    toast.success(`${a.icon ?? "🏅"} ${copy.retention.achievementUnlocked(a.name)}`, {
      description: a.description,
    });
  }
}

export function DailyPulse() {
  const { userId } = useAuth();
  const { data: profile } = useProfile(userId);
  const { data: today } = useTodayCheckIn(userId);
  const { mutateAsync: checkIn, isPending } = useDailyCheckIn();

  const done = !!today;
  const streak = profile?.streak ?? 0;
  const multiplier = profile?.streakMultiplier ?? 1;
  const recoveryMode = profile?.recoveryMode ?? false;
  const ringPct = done ? 100 : 0;

  const streakTone = useMemo(() => {
    if (streak >= 14) return "text-warn";
    if (streak >= 7) return "text-primary";
    if (streak >= 3) return "text-primary/70";
    return "text-muted-foreground";
  }, [streak]);

  const onCheckIn = async () => {
    try {
      const res = await checkIn();
      if (res.already_checked_in) {
        toast.message(copy.retention.alreadyCheckedIn);
        return;
      }
      const xpMsg =
        multiplier > 1 ? `+${res.xp_awarded} XP (${multiplier}x streak)` : `+${res.xp_awarded} XP`;
      toast.success(xpMsg, { description: res.insight });
      showAchievementToasts(res.progress?.achievements_unlocked);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : copy.errors.generic);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 backdrop-blur",
        recoveryMode
          ? "border-warn/30 bg-gradient-to-br from-warn/10 to-card/80"
          : "border-primary/25 bg-gradient-to-br from-primary/10 to-card/80",
      )}
    >
      {recoveryMode && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-warn/10 px-3 py-1.5 text-xs text-warn">
          <ShieldCheck className="size-3.5" />
          Modo Recuperação ativo — XP em dobro por {profile?.recoveryDaysLeft ?? 0} dia(s)
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="relative flex size-14 items-center justify-center rounded-full border-2 border-primary/40"
            style={{
              background: `conic-gradient(var(--color-primary) ${ringPct}%, transparent ${ringPct}%)`,
            }}
          >
            <div className="flex size-11 items-center justify-center rounded-full bg-card">
              <Sparkles className="size-5 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="heading-section">
              Pulso diário da <span className="text-highlight">cidade</span>
            </h2>
            <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
              {done
                ? String(today?.insight ?? copy.retention.dailyPulseDone)
                : copy.retention.dailyPulseCta}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className={cn("flex items-center gap-1 text-xs font-medium", streakTone)}>
                <Flame className="size-3.5" />
                {copy.retention.streakDays(streak)}
              </p>
              {multiplier > 1 && (
                <span className="flex items-center gap-0.5 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">
                  <Zap className="size-2.5" />
                  {multiplier}x XP
                </span>
              )}
            </div>
          </div>
        </div>
        {!done ? (
          <button
            type="button"
            disabled={isPending || !userId}
            onClick={onCheckIn}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? copy.retention.checkingIn : copy.retention.checkInBtn}
          </button>
        ) : (
          <Link
            to="/live"
            className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs text-primary hover:bg-primary/15"
          >
            {copy.retention.openLiveMap}
          </Link>
        )}
      </div>
    </div>
  );
}
