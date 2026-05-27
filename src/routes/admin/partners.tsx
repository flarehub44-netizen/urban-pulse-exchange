import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  useAdminPartnerApplications,
  useAdminApprovePartner,
  useAdminRejectPartner,
  useAdminActivePartners,
  useAdminUpdatePartnerTerms,
} from "@/hooks/use-admin-dashboard";
import { copy } from "@/copy/pt-BR";
import { InlineError } from "@/components/viax/inline-error";
import { formatBRL } from "@/lib/parimutuel";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trackProductEvent } from "@/lib/product-analytics";

export const Route = createFileRoute("/admin/partners")({
  component: AdminPartnersPage,
});

function AdminPartnersPage() {
  const { data: apps, isError, refetch } = useAdminPartnerApplications();
  const { data: active, isError: activeError, refetch: refetchActive } = useAdminActivePartners();
  const { mutateAsync: approve, isPending: approving } = useAdminApprovePartner();
  const { mutateAsync: reject, isPending: rejecting } = useAdminRejectPartner();
  const { mutateAsync: updateTerms, isPending: savingTerms } = useAdminUpdatePartnerTerms();
  const [approveTerms, setApproveTerms] = useState<Record<string, { share: string; cpa: string }>>(
    {},
  );
  const [activeTerms, setActiveTerms] = useState<
    Record<string, { share: string; cpa: string; useDefault: boolean }>
  >({});
  const [approvalStep, setApprovalStep] = useState<Record<string, 1 | 2 | 3>>({});

  useEffect(() => {
    if (!active?.length) return;
    setActiveTerms((prev) => {
      const next = { ...prev };
      for (const p of active) {
        if (next[p.user_id]) continue;
        next[p.user_id] = {
          share: String(p.revenue_share_pct),
          cpa: p.cpa_amount != null ? String(p.cpa_amount) : "",
          useDefault: p.cpa_amount == null,
        };
      }
      return next;
    });
  }, [active]);

  if (isError || activeError) {
    return (
      <InlineError
        onRetry={() => {
          void refetch();
          void refetchActive();
        }}
      />
    );
  }

  const getApproveTerms = (userId: string) => approveTerms[userId] ?? { share: "0.20", cpa: "" };

  const onApprove = async (userId: string, handle: string) => {
    const terms = getApproveTerms(userId);
    const share = Number(terms.share);
    if (!share || share <= 0 || share > 1) {
      toast.error("Comissão inválida (use 0–1).");
      return;
    }
    const cpaRaw = terms.cpa.trim();
    const cpaAmount = cpaRaw === "" ? null : Number(cpaRaw);
    if (cpaAmount != null && (Number.isNaN(cpaAmount) || cpaAmount < 0)) {
      toast.error("CPA inválido.");
      return;
    }
    try {
      await approve({ userId, slug: handle, revenueSharePct: share, cpaAmount });
      toast.success("Creator aprovado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onCopyReferral = async (slugOrHandle: string) => {
    const slug = slugOrHandle.trim();
    const referralUrl = `${window.location.origin}/r/${slug}`;
    await navigator.clipboard.writeText(referralUrl);
    trackProductEvent("partner_link_copied", { source: "admin_partners", slug });
    toast.success(`Link copiado: ${referralUrl}`);
  };

  const onReject = async (userId: string) => {
    try {
      await reject({ userId });
      toast.success("Candidatura rejeitada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onSaveActiveTerms = async (userId: string) => {
    const terms = activeTerms[userId];
    if (!terms) return;
    const share = Number(terms.share);
    if (!share || share <= 0 || share > 1) {
      toast.error("Comissão inválida (use 0–1).");
      return;
    }
    let cpaAmount: number | null = null;
    if (!terms.useDefault) {
      cpaAmount = Number(terms.cpa);
      if (Number.isNaN(cpaAmount) || cpaAmount < 0) {
        toast.error("CPA inválido.");
        return;
      }
    }
    try {
      await updateTerms({ userId, revenueSharePct: share, cpaAmount });
      toast.success(copy.admin.partners.termsSaved);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.partners.title}</h1>
        <p className="text-xs text-muted-foreground">Aprovação manual · CPA · revenue share</p>
      </div>

      {!apps?.length && (
        <p className="text-sm text-muted-foreground">{copy.admin.partners.empty}</p>
      )}

      <div className="rounded-xl border bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Funil por creator (sinal rápido)</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
          {(active ?? [])
            .slice()
            .sort((a, b) => b.referrals_count - a.referrals_count)
            .slice(0, 3)
            .map((p) => (
              <div
                key={`funnel-${p.user_id}`}
                className="rounded-lg border bg-surface/40 px-3 py-2"
              >
                <div className="font-medium">@{p.handle}</div>
                <div className="text-muted-foreground mt-1">Indicados: {p.referrals_count}</div>
                <div className="text-muted-foreground">
                  Comissão acumulada: {formatBRL(Number(p.balance))}
                </div>
              </div>
            ))}
          {!active?.length && (
            <div className="rounded-lg border bg-surface/40 px-3 py-2 text-muted-foreground">
              Sem creators ativos para análise.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {(apps ?? []).map((a) => {
          const terms = getApproveTerms(a.user_id);
          const step = approvalStep[a.user_id] ?? 1;
          return (
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
              <div className="mt-3 rounded-lg border bg-surface/40 p-3 text-xs">
                <div className="mb-2 text-muted-foreground">Wizard de aprovação</div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setApprovalStep((prev) => ({ ...prev, [a.user_id]: n as 1 | 2 | 3 }))
                      }
                      className={`size-7 rounded-full border text-[11px] ${
                        step >= n
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="text-muted-foreground">
                    {step === 1
                      ? "Revisar candidatura"
                      : step === 2
                        ? "Definir termos"
                        : "Confirmar aprovação"}
                  </span>
                </div>
              </div>
              {step >= 2 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs">
                    <span className="text-muted-foreground">
                      {copy.admin.partners.revenueShare}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={terms.share}
                      onChange={(e) =>
                        setApproveTerms((prev) => ({
                          ...prev,
                          [a.user_id]: { ...terms, share: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5 mono"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="text-muted-foreground">{copy.admin.partners.cpaAmount}</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      placeholder={copy.admin.partners.cpaUseDefault}
                      value={terms.cpa}
                      onChange={(e) =>
                        setApproveTerms((prev) => ({
                          ...prev,
                          [a.user_id]: { ...terms, cpa: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5 mono"
                    />
                  </label>
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={approving || step < 3}
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
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{copy.admin.partners.activeTitle}</h2>
        {!active?.length && (
          <p className="text-sm text-muted-foreground">{copy.admin.partners.activeEmpty}</p>
        )}
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="border-b bg-surface/60 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Creator</th>
                <th className="px-3 py-2 text-right">{copy.admin.partners.referrals}</th>
                <th className="px-3 py-2 text-right">Saldo</th>
                <th className="px-3 py-2 text-left">{copy.admin.partners.revenueShare}</th>
                <th className="px-3 py-2 text-left">{copy.admin.partners.cpaAmount}</th>
                <th className="px-3 py-2 text-left">Link</th>
                <th className="px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(active ?? []).map((p) => {
                const terms = activeTerms[p.user_id];
                if (!terms) return null;
                return (
                  <tr key={p.user_id} className="border-b border-border/40">
                    <td className="px-3 py-2">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground mono">@{p.handle}</div>
                    </td>
                    <td className="px-3 py-2 text-right mono">{p.referrals_count}</td>
                    <td className="px-3 py-2 text-right mono">{formatBRL(Number(p.balance))}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={1}
                        value={terms.share}
                        onChange={(e) =>
                          setActiveTerms((prev) => ({
                            ...prev,
                            [p.user_id]: { ...terms, share: e.target.value },
                          }))
                        }
                        className="w-20 rounded border bg-surface px-1 py-0.5 mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={terms.useDefault}
                            onChange={(e) =>
                              setActiveTerms((prev) => ({
                                ...prev,
                                [p.user_id]: { ...terms, useDefault: e.target.checked },
                              }))
                            }
                          />
                          {copy.admin.partners.cpaUseDefault}
                        </label>
                        {!terms.useDefault && (
                          <input
                            type="number"
                            min={0}
                            step="1"
                            value={terms.cpa}
                            onChange={(e) =>
                              setActiveTerms((prev) => ({
                                ...prev,
                                [p.user_id]: { ...terms, cpa: e.target.value },
                              }))
                            }
                            className="w-20 rounded border bg-surface px-1 py-0.5 mono"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onCopyReferral(p.slug)}
                          className="rounded border px-2 py-1 text-[10px] hover:bg-surface"
                        >
                          Copiar link
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={savingTerms}
                        onClick={() => onSaveActiveTerms(p.user_id)}
                        className="rounded border px-2 py-1 text-[10px] disabled:opacity-50"
                      >
                        {copy.admin.partners.saveTerms}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
