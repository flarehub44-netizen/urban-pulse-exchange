import { useAdminActionsLog } from "@/hooks/use-admin-dashboard";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminInlineError } from "@/components/admin/admin-inline-error";

export function AdminAuditLog({ limit = 30 }: { limit?: number }) {
  const { data: rows, isError, error, refetch, isLoading } = useAdminActionsLog(true);

  if (isError) return <AdminInlineError error={error} onRetry={() => refetch()} />;

  const list = (rows ?? []).slice(0, limit);

  return (
    <div className="rounded-xl border bg-card/60 p-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Trilha de auditoria (admin_actions)
      </h2>
      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs">
          {list.map((a) => (
            <li key={a.id} className="rounded-lg border bg-surface/40 px-3 py-2">
              <div className="flex justify-between gap-2">
                <span className="font-medium text-primary">{a.action}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(a.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              <p className="mt-0.5 text-muted-foreground">
                {a.admin_username ?? "—"}
                {a.target_type && ` · ${a.target_type}`}
                {a.target_id && ` #${a.target_id.slice(0, 8)}`}
              </p>
            </li>
          ))}
          {!list.length && (
            <li className="text-muted-foreground">Nenhuma ação registrada ainda.</li>
          )}
        </ul>
      )}
    </div>
  );
}
