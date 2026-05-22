import { createFileRoute } from "@tanstack/react-router";
import { usePartnerSubAffiliates } from "@/hooks/use-partner";
import { copyShareUrl } from "@/lib/share-url";
import { copy } from "@/copy/pt-BR";
import { toast } from "sonner";

export const Route = createFileRoute("/partner/sub-affiliates")({
  component: PartnerSubAffiliatesPage,
});

function PartnerSubAffiliatesPage() {
  const { data } = usePartnerSubAffiliates();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.subAffiliates}</h1>
      <p className="text-xs text-muted-foreground">
        Rede leve · máximo 2 níveis · override sobre comissão do sub-creator.
      </p>
      {data?.invite_code && (
        <div className="rounded-xl border bg-primary/5 p-4">
          <div className="text-xs text-muted-foreground">{copy.partner.subInvite}</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="text-lg font-bold mono">{data.invite_code}</code>
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={() => {
                void copyShareUrl("/settings", { sub: data.invite_code });
                toast.success("Código copiado com instruções");
              }}
            >
              Copiar
            </button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {(data?.subs ?? []).map((s) => (
          <div key={s.user_id} className="rounded-xl border px-4 py-3 flex justify-between">
            <span className="mono">@{s.slug}</span>
            <span className="text-sm text-muted-foreground">{s.tier}</span>
          </div>
        ))}
        {!data?.subs?.length && (
          <p className="text-sm text-muted-foreground">Nenhum sub-creator ainda.</p>
        )}
      </div>
    </div>
  );
}
