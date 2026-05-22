import { Link } from "@tanstack/react-router";
import { Sunrise, ChevronRight } from "lucide-react";
import type { Market } from "@/store/viax-store";

interface Props {
  markets: Market[];
}

export function TomorrowPreview({ markets }: Props) {
  const drafts = markets.filter((m) => m.status === "draft").slice(0, 3);
  if (drafts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
        <Sunrise className="size-3.5" />
        Amanhã em São Paulo
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Mercados que estão por abrir — chegue primeiro.
      </p>

      <div className="mt-3 space-y-2">
        {drafts.map((m) => (
          <Link
            key={m.id}
            to="/markets/$marketId"
            params={{ marketId: m.id }}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5 hover:border-primary/30 hover:bg-surface/40"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.region} · Em breve
              </div>
              <div className="mt-0.5 line-clamp-1 text-sm font-medium">{m.question}</div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      {drafts.length > 0 && (
        <Link
          to="/markets"
          search={{ status: "draft" }}
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Ver todos os próximos →
        </Link>
      )}
    </div>
  );
}
