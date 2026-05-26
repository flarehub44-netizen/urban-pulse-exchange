import { createFileRoute } from "@tanstack/react-router";
import { usePartnerInvites } from "@/hooks/use-partner";
import { copy } from "@/copy/pt-BR";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/partner/invites")({
  component: PartnerInvitesPage,
});

function PartnerInvitesPage() {
  const { data: list } = usePartnerInvites();
  const [filter, setFilter] = useState<"all" | "deposit" | "bet">("all");

  const filtered = useMemo(() => {
    const data = list ?? [];
    if (filter === "deposit") return data.filter((r) => r.first_deposit);
    if (filter === "bet") return data.filter((r) => r.first_bet);
    return data;
  }, [list, filter]);

  const stats = useMemo(() => {
    const all = list ?? [];
    return {
      total: all.length,
      deposited: all.filter((r) => r.first_deposit).length,
      bet: all.filter((r) => r.first_bet).length,
    };
  }, [list]);

  const exportCsv = () => {
    const rows = filtered.map((r) => ({
      trader: r.handle,
      city: r.city ?? "",
      first_deposit: r.first_deposit ? "yes" : "no",
      first_bet: r.first_bet ? "yes" : "no",
      joined_at: r.joined_at,
    }));
    const header = "trader,city,first_deposit,first_bet,joined_at";
    const body = rows
      .map((r) => `${r.trader},${r.city},${r.first_deposit},${r.first_bet},${r.joined_at}`)
      .join("\\n");
    const blob = new Blob([`${header}\\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "partner-invites.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.invites}</h1>
      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <div className="rounded-lg border bg-card/40 px-3 py-2">
          <div className="text-muted-foreground">Indicados</div>
          <div className="mono mt-1 text-lg font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-lg border bg-card/40 px-3 py-2">
          <div className="text-muted-foreground">Com depósito</div>
          <div className="mono mt-1 text-lg font-semibold">{stats.deposited}</div>
        </div>
        <div className="rounded-lg border bg-card/40 px-3 py-2">
          <div className="text-muted-foreground">Com primeira aposta</div>
          <div className="mono mt-1 text-lg font-semibold">{stats.bet}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all" as const, label: "Todos" },
            { key: "deposit" as const, label: "Com depósito" },
            { key: "bet" as const, label: "Com aposta" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              filter === item.key
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-surface-2"
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={exportCsv}
          className="ml-auto rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-2"
        >
          Exportar CSV
        </button>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Trader</th>
              <th className="px-3 py-2">Cidade</th>
              <th className="px-3 py-2">Depósito</th>
              <th className="px-3 py-2">{copy.partner.inviteBetColumn}</th>
              <th className="px-3 py-2 text-right">Entrou</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.user_id} className="border-t">
                <td className="px-3 py-2 mono">@{r.handle}</td>
                <td className="px-3 py-2 text-center text-muted-foreground">{r.city ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.first_deposit ? "✓" : "—"}</td>
                <td className="px-3 py-2 text-center">{r.first_bet ? "✓" : "—"}</td>
                <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.joined_at), { locale: ptBR, addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhum indicado ainda.</p>
        )}
      </div>
    </div>
  );
}
