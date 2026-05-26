import { Zap, X } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useActiveEvents } from "@/hooks/use-active-events";
import { InlineError } from "@/components/viax/inline-error";
import { cn } from "@/lib/utils";

export function EventsBanner() {
  const { data: events, isError, error, refetch, isFetched } = useActiveEvents();
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (isError) {
    return (
      <InlineError
        message={error instanceof Error ? error.message : "Não foi possível carregar os eventos."}
        onRetry={() => void refetch()}
      />
    );
  }

  const visible = (events ?? []).filter((e) => !dismissed.includes(e.id));

  if (isFetched && visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum evento ativo no momento.</p>
    );
  }

  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      {visible.map((event) => (
        <div
          key={event.id}
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border border-warn/30",
            "bg-gradient-to-r from-warn/10 to-card/60 px-4 py-3",
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">{event.badge_icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-warn">{event.name}</span>
                {event.xp_boost > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">
                    <Zap className="size-2.5" />+{event.xp_boost} XP bônus
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Encerra{" "}
                {formatDistanceToNow(new Date(event.ends_at), { locale: ptBR, addSuffix: true })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed((d) => [...d, event.id])}
            className="shrink-0 rounded-full p-1 text-muted-foreground/50 hover:text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
