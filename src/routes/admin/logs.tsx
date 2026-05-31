import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAdminActionsLog } from "@/hooks/use-admin-dashboard";
import { AdminInlineError } from "@/components/admin/admin-inline-error";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogsPage,
});

function AdminLogsPage() {
  const { data, isError, error, refetch, isLoading, isFetching } = useAdminActionsLog(true);
  const [search, setSearch] = useState("");
  const [targetType, setTargetType] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const rows = data ?? [];

  const targetTypes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.target_type && set.add(r.target_type));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (targetType !== "all" && r.target_type !== targetType) return false;
      if (!q) return true;
      return (
        r.action.toLowerCase().includes(q) ||
        (r.admin_username ?? "").toLowerCase().includes(q) ||
        (r.target_id ?? "").toLowerCase().includes(q) ||
        (r.target_type ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, targetType]);

  if (isError) return <AdminInlineError error={error} onRetry={() => refetch()} />;

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
        <p className="text-sm text-muted-foreground">
          Trilha de auditoria das ações administrativas (RPC{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-xs">get_admin_actions_log</code>).
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Buscar ação, admin, target_id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-md"
        />
        <Select value={targetType} onValueChange={setTargetType}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Tipo de alvo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {targetTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-surface"
          disabled={isFetching}
        >
          {isFetching ? "Atualizando…" : "Atualizar"}
        </button>
        <span className="text-xs text-muted-foreground sm:ml-auto">
          {filtered.length} de {rows.length} registros
        </span>
      </div>

      <div className="rounded-xl border bg-card/60">
        {isLoading ? (
          <p className="p-4 text-xs text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">Nenhum log encontrado.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((a) => {
              const isOpen = expanded.has(a.id);
              const created = new Date(a.created_at);
              return (
                <li key={a.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-primary">{a.action}</span>
                        {a.target_type && (
                          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {a.target_type}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground break-all">
                        {a.admin_username ?? "—"}
                        {a.target_id && <> · #{a.target_id}</>}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                      <span className="text-[10px] text-muted-foreground">
                        {format(created, "dd/MM/yyyy HH:mm:ss")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(created, { addSuffix: true, locale: ptBR })}
                      </span>
                      {a.payload && (
                        <button
                          type="button"
                          onClick={() => toggle(a.id)}
                          className="text-[10px] font-medium text-primary hover:underline"
                        >
                          {isOpen ? "Ocultar payload" : "Ver payload"}
                        </button>
                      )}
                    </div>
                  </div>
                  {isOpen && a.payload && (
                    <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-surface/60 p-3 text-[11px] leading-relaxed">
                      {JSON.stringify(a.payload, null, 2)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
