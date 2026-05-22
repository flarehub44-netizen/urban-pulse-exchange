import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EmptyStateAction =
  | {
      label: string;
      to: string;
      search?: Record<string, unknown>;
      params?: Record<string, string>;
    }
  | { label: string; onClick: () => void };

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/60 text-center backdrop-blur",
        compact ? "p-6" : "p-8 sm:p-10",
        className,
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "mx-auto text-muted-foreground/35",
            compact ? "mb-2 size-7" : "mb-3 size-9",
          )}
          strokeWidth={1.25}
        />
      )}
      <p className={cn("font-medium", compact ? "text-sm" : "text-sm sm:text-base")}>{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {"to" in action ? (
            <Button asChild size="sm" variant="default">
              <Link to={action.to} search={action.search} params={action.params}>
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
