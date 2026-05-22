import { AnimatedNumber } from "@/components/viax/animated-number";
import { cn } from "@/lib/utils";

export function PartnerStatCard({
  label,
  value,
  format,
  hint,
  className,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card/60 p-4 backdrop-blur", className)}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <AnimatedNumber
        value={value}
        format={format ?? String}
        className="mt-1 text-2xl font-semibold tracking-tight"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
