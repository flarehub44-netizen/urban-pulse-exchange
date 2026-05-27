import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useActiveEvents } from "@/hooks/use-active-events";
import { SeasonalEventCard } from "@/components/viax/seasonal-event-card";
import { InlineError } from "@/components/viax/inline-error";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

type SeasonalEventsStripProps = {
  variant?: "hero" | "compact" | "dashboard";
  className?: string;
  showCta?: boolean;
};

export function SeasonalEventsStrip({
  variant = "compact",
  className,
  showCta = true,
}: SeasonalEventsStripProps) {
  const { data: events, isError, error, refetch, isFetched, isLoading } = useActiveEvents();
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (isError) {
    if (variant === "dashboard") {
      return (
        <InlineError
          message={error instanceof Error ? error.message : copy.events.loadError}
          onRetry={() => void refetch()}
        />
      );
    }
    return null;
  }

  const visible = (events ?? []).filter((e) => !dismissed.includes(e.id));

  if (isFetched && visible.length === 0) return null;
  if (isLoading && !visible.length) {
    return (
      <div className={cn("h-14 animate-pulse rounded-xl bg-surface/60", className)} aria-hidden />
    );
  }
  if (!visible.length) return null;

  if (variant === "hero") {
    return (
      <section
        data-testid="seasonal-events-hero"
        className={cn("mx-auto max-w-7xl px-6 py-6", className)}
        aria-label={copy.events.sectionTitle}
      >
        <div className="rounded-2xl border border-warn/25 bg-gradient-to-br from-warn/10 via-card/40 to-primary/5 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-warn" />
              <h2 className="text-sm font-semibold">{copy.events.sectionTitle}</h2>
              <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-medium text-warn">
                {copy.events.liveNow}
              </span>
            </div>
            {showCta && (
              <Link to="/dashboard" className="text-xs font-medium text-primary hover:underline">
                {copy.events.viewOnDashboard}
              </Link>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((event) => (
              <SeasonalEventCard key={event.id} event={event} variant="banner" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "dashboard") {
    return (
      <div data-testid="seasonal-events-dashboard" className={cn("space-y-2", className)}>
        {visible.map((event) => (
          <div key={event.id} className="relative">
            <SeasonalEventCard event={event} variant="banner" />
            <button
              type="button"
              aria-label={copy.events.dismiss}
              onClick={() => setDismissed((d) => [...d, event.id])}
              className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground/50 hover:text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      data-testid="seasonal-events-strip"
      className={cn("space-y-2", className)}
      aria-label={copy.events.sectionTitle}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-warn" />
          {copy.events.sectionTitle}
        </div>
        {showCta && (
          <Link to="/dashboard" className="text-[11px] text-primary hover:underline">
            {copy.events.viewOnDashboard}
          </Link>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
        {visible.map((event) => (
          <SeasonalEventCard
            key={event.id}
            event={event}
            variant="compact"
            className="snap-start"
          />
        ))}
      </div>
    </section>
  );
}
