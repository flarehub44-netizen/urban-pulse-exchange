import { Countdown } from "@/components/viax/countdown";
import { copy } from "@/copy/pt-BR";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";

export function TrafficSlotWaiting({
  nextStartsAt,
  lastEndedAt,
}: {
  nextStartsAt: number | null;
  lastEndedAt: number | null;
}) {
  if (!nextStartsAt) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-8 text-center">
        <Clock className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">{copy.traffic.waitingNoSchedule}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.traffic.waitingNoScheduleHint}</p>
      </div>
    );
  }

  return (
    <section
      className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-6 text-center"
      aria-labelledby="traffic-next-heading"
    >
      <Clock className="mx-auto size-8 text-primary" />
      <h2 id="traffic-next-heading" className="mt-3 text-sm font-semibold">
        {copy.traffic.nextEventTitle}
      </h2>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
        <Countdown to={nextStartsAt} />
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {format(nextStartsAt, "EEEE, d MMM · HH:mm", { locale: ptBR })}
      </p>
      {lastEndedAt != null && (
        <p className="mt-3 text-xs text-muted-foreground">
          {copy.traffic.lastEndedPrefix}{" "}
          {format(lastEndedAt, "HH:mm", { locale: ptBR })}
        </p>
      )}
    </section>
  );
}
