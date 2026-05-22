import { cn } from "@/lib/utils";

export function AdminStatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "neutral" | "up" | "warn" | "down";
}) {
  return (
    <div className="rounded-xl border bg-card/80 p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-xl font-semibold",
          tone === "up" && "text-up",
          tone === "warn" && "text-warn",
          tone === "down" && "text-down",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
