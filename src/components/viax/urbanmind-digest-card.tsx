import { Link } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { useUrbanMindDigest } from "@/hooks/use-urbanmind-digest";

export function UrbanMindDigestCard() {
  const { data, isLoading } = useUrbanMindDigest();

  if (isLoading || !data?.body) return null;

  return (
    <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Brain className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">{data.headline ?? copy.retention.urbanmindDigestTitle}</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{data.body}</p>
          {data.bets_vs_ai > 0 && (
            <p className="mt-2 text-[11px] text-primary">
              {copy.retention.vsAiRate(data.wins_vs_ai, data.bets_vs_ai)}
            </p>
          )}
          <Link
            to="/urbanmind"
            className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
          >
            {copy.retention.openUrbanmind} →
          </Link>
        </div>
      </div>
    </div>
  );
}
