import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  interactive,
  embedded,
  className,
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: LucideIcon;
  tone?: "default" | "primary";
  interactive?: boolean;
  embedded?: boolean;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div
      className={cn(
        !embedded && (interactive ? "surface-card-interactive" : "surface-card"),
        embedded && "rounded-xl border border-border/60 bg-surface/40 p-3",
        !embedded && "p-4",
        embedded && "p-3",
        tone === "primary" && "border-primary/30 bg-primary/5",
        interactive && "cursor-pointer",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="size-3 shrink-0" />}
        {label}
      </div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold",
          mono && "mono tabular-nums",
          tone === "primary" && "text-primary",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
