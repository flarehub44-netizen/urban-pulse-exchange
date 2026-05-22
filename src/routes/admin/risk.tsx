import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminRiskAlerts } from "@/hooks/use-admin-dashboard";
import { copy } from "@/copy/pt-BR";
import { InlineError } from "@/components/viax/inline-error";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/risk")({
  component: AdminRiskPage,
});

function AdminRiskPage() {
  const { data: alerts, isError, refetch } = useAdminRiskAlerts();

  if (isError) return <InlineError onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.risk.title}</h1>
        <p className="text-xs text-muted-foreground">Heurísticas v1 · multi-conta e volume</p>
      </div>

      <ul className="space-y-3">
        {(alerts ?? []).map((a, i) => (
          <li
            key={`${a.user_id}-${i}`}
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              a.severity === "medium" ? "border-warn/40 bg-warn/5" : "bg-card/60",
            )}
          >
            <p className="font-medium">{a.detail}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {a.type} · {a.username ?? a.user_id}
            </p>
            <Link
              to="/admin/users"
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              Ver usuário →
            </Link>
          </li>
        ))}
        {!alerts?.length && (
          <p className="text-sm text-muted-foreground">{copy.admin.risk.empty}</p>
        )}
      </ul>
    </div>
  );
}
