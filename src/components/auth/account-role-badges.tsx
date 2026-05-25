import { useAccountContext } from "@/hooks/use-account-context";
import { useAuth } from "@/hooks/use-auth";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

export function AccountRoleBadges({ className }: { className?: string }) {
  const { isRegistered, isAnonymous } = useAuth();
  const { data: ctx } = useAccountContext();

  const badges: { label: string; tone: string }[] = [];

  if (ctx?.admin?.is_admin) {
    badges.push({
      label: copy.auth.roleAdmin,
      tone: "border-primary/40 bg-primary/10 text-primary",
    });
  }
  if (ctx?.partner?.role === "partner" && ctx.partner.status === "active") {
    badges.push({ label: copy.auth.rolePartner, tone: "border-warn/40 bg-warn/10 text-warn" });
  }
  if (isRegistered || (!isAnonymous && badges.length === 0)) {
    badges.push({
      label: copy.auth.roleTrader,
      tone: "border-border bg-surface text-muted-foreground",
    });
  } else if (isAnonymous) {
    badges.push({ label: copy.auth.roleAnonymous, tone: "border-warn/30 bg-warn/5 text-warn" });
  }

  if (badges.length === 0) return null;

  return (
    <div className={cn("hidden sm:flex items-center gap-1", className)}>
      {badges.map((b) => (
        <span
          key={b.label}
          className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", b.tone)}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
