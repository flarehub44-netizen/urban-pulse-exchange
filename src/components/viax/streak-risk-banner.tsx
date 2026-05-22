import { useMemo } from "react";
import { Flame, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/copy/pt-BR";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { useTodayCheckIn } from "@/hooks/use-daily-check-in";
import { useStreakFreezeFn } from "@/actions/retention";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function StreakRiskBanner() {
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const { data: today } = useTodayCheckIn(userId);
  const queryClient = useQueryClient();
  const { mutateAsync: freeze, isPending } = useMutation({
    mutationFn: () => useStreakFreezeFn({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", userId] });
      queryClient.invalidateQueries({ queryKey: ["daily-check-in", userId] });
    },
  });

  const show = useMemo(() => {
    if (!profile || profile.streak < 2 || today) return false;
    const h = new Date().getHours();
    return h >= 18;
  }, [profile, today]);

  if (!show) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <Flame className="size-4 text-warn" />
        <span>{copy.retention.streakAtRisk(profile.streak)}</span>
      </div>
      <button
        type="button"
        disabled={isPending}
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
    </div>
  );
}
