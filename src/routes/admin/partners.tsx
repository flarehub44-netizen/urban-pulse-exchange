import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  useAdminPartnerApplications,
  useAdminApprovePartner,
  useAdminRejectPartner,
} from "@/hooks/use-admin-dashboard";
import { copy } from "@/copy/pt-BR";
import { InlineError } from "@/components/viax/inline-error";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/partners")({
  component: AdminPartnersPage,
});

function AdminPartnersPage() {
  const { data: apps, isError, refetch } = useAdminPartnerApplications();
  const { mutateAsync: approve, isPending: approving } = useAdminApprovePartner();
  const { mutateAsync: reject, isPending: rejecting } = useAdminRejectPartner();

  if (isError) return <InlineError onRetry={() => refetch()} />;

  const onApprove = async (userId: string, handle: string) => {
    try {
      await approve({ userId, slug: handle });
      toast.success("Creator aprovado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onReject = async (userId: string) => {
    try {
      await reject({ userId });
      toast.success("Candidatura rejeitada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.partners.title}</h1>
        <p className="text-xs text-muted-foreground">Aprovação manual · revenue share</p>
      </div>
      {!apps?.length && (
        <p className="text-sm text-muted-foreground">{copy.admin.partners.empty}</p>
      )}
      <div className="space-y-3">
        {(apps ?? []).map((a) => (
          <div key={a.id} className="rounded-xl border bg-card/60 p-4">
            <div className="flex justify-between gap-2">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground mono">@{a.handle}</div>
                {a.focus_city && (
                  <div className="text-xs text-muted-foreground mt-1">{a.focus_city}</div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(a.created_at), { locale: ptBR, addSuffix: true })}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{a.bio}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={approving}
                onClick={() => onApprove(a.user_id, a.handle)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
              >
                {copy.admin.partners.approve}
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={() => onReject(a.user_id)}
                className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
              >
                {copy.admin.partners.reject}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
