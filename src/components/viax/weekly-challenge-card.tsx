import { copy } from "@/copy/pt-BR";
import { weeklyPrecisionChallenge } from "@/lib/urbanmind-coach";
import { Target } from "lucide-react";

export function WeeklyChallengeCard({ accuracy }: { accuracy: number }) {
  const challenge = weeklyPrecisionChallenge(accuracy);

  return (
    <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Target className="size-4 text-primary" />
        {copy.retention.weeklyChallengeTitle}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{challenge.label}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-700"
          style={{ width: `${challenge.progress * 100}%` }}
        />
      </div>
    </div>
  );
}
