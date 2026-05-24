import { createFileRoute } from "@tanstack/react-router";
import { usePartnerInvites } from "@/hooks/use-partner";
import { copy } from "@/copy/pt-BR";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/partner/invites")({
  component: PartnerInvitesPage,
});

function PartnerInvitesPage() {
  const { data: list } = usePartnerInvites();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.invites}</h1>
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
            {(list ?? []).map((r) => (
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
        {!list?.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhum indicado ainda.</p>
        )}
      </div>
    </div>
  );
}
