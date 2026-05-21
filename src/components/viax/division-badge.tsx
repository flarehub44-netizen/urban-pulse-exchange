import { cn } from "@/lib/utils";
import type { Division } from "@/store/viax-store";

const cfg: Record<Division, { label: string; color: string; bg: string; border: string }> = {
  Bronze:   { label: "Bronze",   color: "text-amber-300",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
  Prata:    { label: "Prata",    color: "text-slate-200",  bg: "bg-slate-400/10",  border: "border-slate-300/30" },
  Ouro:     { label: "Ouro",     color: "text-yellow-300", bg: "bg-yellow-500/10", border: "border-yellow-400/30" },
  Platina:  { label: "Platina",  color: "text-cyan-200",   bg: "bg-cyan-500/10",   border: "border-cyan-400/30" },
  Diamante: { label: "Diamante", color: "text-sky-200",    bg: "bg-sky-500/10",    border: "border-sky-400/30" },
  Elite:    { label: "Elite",    color: "text-fuchsia-200",bg: "bg-fuchsia-500/10",border: "border-fuchsia-400/30" },
};

export function DivisionBadge({ division, className }: { division: Division; className?: string }) {
  const c = cfg[division];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", c.bg, c.border, c.color, className)}>
      <span className="size-1.5 rounded-full bg-current animate-[pulse-glow_2s_ease-in-out_infinite]" />
      {c.label}
    </span>
  );
}
