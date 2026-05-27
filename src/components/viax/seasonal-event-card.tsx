import { Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PlatformEvent } from "@/actions/events";
import { cn } from "@/lib/utils";
import { copy } from "@/copy/pt-BR";

type SeasonalEventCardProps = {
  event: PlatformEvent;
  variant?: "banner" | "compact" | "pill";
  className?: string;
};

export function SeasonalEventCard({
  event,
  variant = "banner",
  className,
}: SeasonalEventCardProps) {
  const endsLabel = formatDistanceToNow(new Date(event.ends_at), {
    locale: ptBR,
    addSuffix: true,
  });

  if (variant === "pill") {
    return (
      <div
        data-testid="seasonal-event-pill"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-warn/30 bg-warn/10 px-3 py-1.5 text-xs",
          className,
        )}
      >
        <span>{event.badge_icon}</span>
        <span className="font-medium text-warn">{event.name}</span>
        {event.xp_boost > 0 && (
          <span className="text-[10px] text-muted-foreground">+{event.xp_boost} XP</span>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        data-testid="seasonal-event-card"
        className={cn(
          "flex min-w-[240px] max-w-xs shrink-0 items-center gap-3 rounded-xl border border-warn/25 bg-card/80 px-3 py-2.5",
          className,
        )}
      >
        <span className="text-lg">{event.badge_icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-warn">{event.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {copy.events.endsIn(endsLabel)}
            {event.xp_boost > 0 ? ` · +${event.xp_boost} XP` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="seasonal-event-card"
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-warn/30",
        "bg-gradient-to-r from-warn/10 to-card/60 px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-xl">{event.badge_icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-warn">{event.name}</span>
            {event.xp_boost > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">
                <Zap className="size-2.5" />
                {copy.events.xpBoost(event.xp_boost)}
              </span>
            )}
          </div>
          {event.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{event.description}</p>
          ) : null}
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {copy.events.endsIn(endsLabel)}
          </p>
        </div>
      </div>
    </div>
  );
}
