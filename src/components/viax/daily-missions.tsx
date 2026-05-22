import { motion } from "framer-motion";
import { CheckCircle2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useDailyMissions } from "@/hooks/use-daily-missions";
import { cn } from "@/lib/utils";
import type { DailyMission } from "@/actions/retention";

export function DailyMissions() {
  const { data: missions, isLoading } = useDailyMissions();

  if (isLoading || !missions?.length) return null;

  const completed = missions.filter((m) => m.completed).length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="heading-section">
          Missões do <span className="text-highlight">Dia</span>
        </h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {completed}/{missions.length}
        </span>
      </div>
      <div className="space-y-2">
        {missions.map((m) => (
          <MissionRow key={m.id} mission={m} />
        ))}
      </div>
    </div>
  );
}

function MissionRow({ mission }: { mission: DailyMission }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-colors",
        mission.completed
          ? "border-primary/20 bg-primary/5 opacity-70"
          : "border-border/50 bg-surface/60 hover:border-primary/30",
      )}
    >
      <span className="text-xl leading-none">{mission.icon}</span>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            mission.completed && "line-through text-muted-foreground",
          )}
        >
          {mission.label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-tight">{mission.description}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {mission.completed ? (
          <CheckCircle2 className="size-4 text-primary" />
        ) : (
          <span className="flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            <Zap className="size-3" /> +{mission.xp_reward}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function useMissionToast() {
  return (label: string, xp: number) => {
    toast.success(`Missão concluída: ${label}`, {
      description: `+${xp} XP ganhos`,
      duration: 4000,
    });
  };
}
