import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Flame, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const kindIcon: Record<string, typeof Zap> = {
  signup: Zap,
  deposit: Flame,
  commission: Activity,
  rank: Trophy,
};

export function PartnerLiveFeed({
  events,
}: {
  events: { kind: string; message: string; at: string }[];
}) {
  if (!events.length) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Sem eventos recentes.</p>;
  }
  return (
    <ul className="space-y-2 max-h-64 overflow-y-auto">
      {events.map((e, i) => {
        const Icon = kindIcon[e.kind] ?? Zap;
        return (
          <li
            key={`${e.at}-${i}`}
            className="flex gap-2 rounded-lg border bg-surface/40 px-3 py-2 text-xs"
          >
            <Icon className={cn("size-3.5 shrink-0 mt-0.5", e.kind === "commission" && "text-up")} />
            <div className="min-w-0 flex-1">
              <p>{e.message}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(e.at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
