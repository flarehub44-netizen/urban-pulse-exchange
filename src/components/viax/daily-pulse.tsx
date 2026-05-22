import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/copy/pt-BR";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { useTodayCheckIn, useDailyCheckIn } from "@/hooks/use-daily-check-in";
import { cn } from "@/lib/utils";
import type { AchievementUnlock } from "@/actions/retention";

function showAchievementToasts(items: AchievementUnlock[] | undefined) {
  if (!items?.length) return;
  for (const a of items) {
    toast.success(copy.retention.achievementUnlocked(a.name), {
      description: a.description,
    });
  }
}

export function DailyPulse() {
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const { data: today } = useTodayCheckIn(userId);
  const { mutateAsync: checkIn, isPending } = useDailyCheckIn();

  const done = !!today;
  const streak = profile?.streak ?? 0;
  const ringPct = done ? 100 : 0;

  const streakTone = useMemo(() => {
    if (streak >= 7) return "text-warn";
    if (streak >= 3) return "text-primary";
    return "text-muted-foreground";
  }, [streak]);

  const onCheckIn = async () => {
    try {
      const res = await checkIn();
      if (res.already_checked_in) {
        toast.message(copy.retention.alreadyCheckedIn);
        return;
      }
      toast.success(copy.retention.checkInSuccess(res.xp_awarded ?? 100), {
        description: res.insight,
      });
      showAchievementToasts(res.progress?.achievements_unlocked);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : copy.errors.generic);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-card/80 p-4 backdrop-blur">
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
            <h2 className="text-sm font-semibold">{copy.retention.dailyPulseTitle}</h2>
            <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
              {done ? today?.insight ?? copy.retention.dailyPulseDone : copy.retention.dailyPulseCta}
            </p>
            <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", streakTone)}>
              <Flame className="size-3.5" />
              {copy.retention.streakDays(streak)}
            </p>
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
