import { Link } from "@tanstack/react-router";
import { Trophy, Zap } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
  className?: string;
};

export function ImpactProgramBanner({ compact = false, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/80 to-card/60 p-4 backdrop-blur",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Trophy className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{copy.impact.programTitle}</h3>
            <p className={cn("mt-1 text-muted-foreground", compact ? "text-xs" : "text-sm")}>
              {copy.impact.programSubtitle}
            </p>
            {!compact && (
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {copy.impact.howItWorksSteps.map((step) => (
                  <li key={step} className="flex gap-2">
                    <Zap className="mt-0.5 size-3 shrink-0 text-primary" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground/90">
              {copy.impact.exclusivePrizeDisclaimer}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/ranking"
            search={{ tab: "impacto" }}
            className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
          >
            {copy.impact.viewRankingCta}
          </Link>
          <Link
            to="/markets/create"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {copy.impact.createEventCta}
          </Link>
        </div>
      </div>
      {!compact && (
        <p className="mt-3 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
          {copy.impact.pendingCreditHint} · {copy.impact.minEligibilityHint}
        </p>
      )}
    </div>
  );
}
