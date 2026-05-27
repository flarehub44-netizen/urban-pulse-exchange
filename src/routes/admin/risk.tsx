import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAdminRiskAlerts,
  useAdminCpaFraudCases,
  useAdminCpaReferrals,
  useAdminTagCpaFraudCase,
  useAdminClearCpaFraudCases,
  useAdminSuspendCpaFraudPartners,
  useAdminBanCpaFraudUsers,
  type AdminCpaFraudCase,
  type AdminCpaReferral,
} from "@/hooks/use-admin-dashboard";
import { copy } from "@/copy/pt-BR";
import { InlineError } from "@/components/viax/inline-error";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/parimutuel";
import { DesktopTableWrap, MobileDataList, MobileFieldRow } from "@/components/ui/responsive-table";

const MIN_ACTION_NOTE = 8;

export const Route = createFileRoute("/admin/risk")({
  component: AdminRiskPage,
});

function statusLabel(status: string) {
  if (status === "open") return copy.admin.risk.statusOpen;
  if (status === "confirmed") return copy.admin.risk.statusConfirmed;
  if (status === "cleared") return copy.admin.risk.statusCleared;
  if (status === "resolved") return copy.admin.risk.statusResolved;
  return status;
}

function statusBadgeClass(status: string) {
  if (status === "confirmed") return "border-warn/50 bg-warn/15 text-warn";
  if (status === "open") return "border-primary/40 bg-primary/10 text-primary";
  if (status === "cleared" || status === "resolved") return "border-up/40 bg-up/10 text-up";
  return "border-border bg-surface/40 text-muted-foreground";
}

function rowAccentClass(status: string | null | undefined, flagged: boolean) {
  if (!flagged) return "";
  if (status === "confirmed") return "bg-warn/5";
  if (status === "open") return "bg-primary/5";
  return "";
}

function readMetaString(meta: Record<string, unknown> | null | undefined, key: string) {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readMetaNumber(meta: Record<string, unknown> | null | undefined, key: string) {
  const value = meta?.[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type ReferralRowProps = {
  row: AdminCpaReferral;
  riskInput: Record<string, string>;
  noteInput: Record<string, string>;
  onRiskChange: (userId: string, value: string) => void;
  onNoteChange: (userId: string, value: string) => void;
  onTag: (row: AdminCpaReferral, status: "open" | "confirmed" | "cleared" | "resolved") => void;
  tagging: boolean;
  showConfirm: boolean;
};

function ReferralRow({
  row,
  riskInput,
  noteInput,
  onRiskChange,
  onNoteChange,
  onTag,
  tagging,
  showConfirm,
}: ReferralRowProps) {
  const flagStatus = row.flag_status ?? (row.flagged ? "open" : null);
  return (
    <tr
      key={row.user_id}
      className={cn("border-b border-border/40", rowAccentClass(flagStatus, row.flagged))}
    >
      <td className="px-3 py-2">
        <div className="font-medium">{row.user_name}</div>
        <div className="mono text-[10px] text-muted-foreground">@{row.user_handle}</div>
        {row.cpf_last4 && (
          <div className="text-[10px] text-muted-foreground">
            {copy.admin.risk.cpfLast4}: •••{row.cpf_last4}
            {row.cpf_duplicate && (
              <span className="ml-1 text-warn">({copy.admin.risk.cpfDuplicate})</span>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="font-medium">{row.partner_handle ? `@${row.partner_handle}` : "—"}</div>
        <div className="text-[10px] text-muted-foreground">{row.partner_slug ?? ""}</div>
      </td>
      <td className="px-3 py-2 text-right mono">
        {formatBRL(Number(row.qualified_deposit_total ?? 0))}
      </td>
      <td className="px-3 py-2">
        {row.flagged ? (
          <span
            className={cn(
              "rounded border px-2 py-0.5 text-[10px] font-medium",
              statusBadgeClass(flagStatus ?? "open"),
            )}
          >
            {statusLabel(flagStatus ?? "open")}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <ReferralActions
          row={row}
          riskInput={riskInput}
          noteInput={noteInput}
          onRiskChange={onRiskChange}
          onNoteChange={onNoteChange}
          onTag={onTag}
          tagging={tagging}
          showConfirm={showConfirm}
        />
      </td>
    </tr>
  );
}

function ReferralActions({
  row,
  riskInput,
  noteInput,
  onRiskChange,
  onNoteChange,
  onTag,
  tagging,
  showConfirm,
}: ReferralRowProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-1">
      <input
        type="number"
        min={0}
        max={100}
        placeholder="Risco"
        value={riskInput[row.user_id] ?? ""}
        onChange={(e) => onRiskChange(row.user_id, e.target.value)}
        className="w-full rounded border bg-surface px-2 py-1.5 mono text-xs md:w-16 md:px-1 md:py-0.5 md:text-[10px]"
      />
      <input
        type="text"
        placeholder={copy.admin.risk.actionNoteLabel}
        value={noteInput[row.user_id] ?? ""}
        onChange={(e) => onNoteChange(row.user_id, e.target.value)}
        className="w-full rounded border bg-surface px-2 py-1.5 text-xs md:w-44 md:px-1 md:py-0.5 md:text-[10px]"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={tagging}
          onClick={() => onTag(row, "open")}
          className="min-h-[44px] rounded border border-primary/40 px-3 py-2 text-xs text-primary disabled:opacity-50 md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]"
        >
          {copy.admin.risk.tagFraud}
        </button>
        {showConfirm && (
          <button
            type="button"
            disabled={tagging}
            onClick={() => onTag(row, "confirmed")}
            className="min-h-[44px] rounded border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn disabled:opacity-50 md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]"
          >
            {copy.admin.risk.tagConfirm}
          </button>
        )}
        {row.flagged && (
          <button
            type="button"
            disabled={tagging}
            onClick={() => onTag(row, "cleared")}
            className="min-h-[44px] rounded border px-3 py-2 text-xs disabled:opacity-50 md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]"
          >
            {copy.admin.risk.tagClear}
          </button>
        )}
      </div>
    </div>
  );
}

function ReferralStatusBadge({ row }: { row: AdminCpaReferral }) {
  const flagStatus = row.flag_status ?? (row.flagged ? "open" : null);
  if (!row.flagged) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  return (
    <span
      className={cn(
        "rounded border px-2 py-0.5 text-[10px] font-medium",
        statusBadgeClass(flagStatus ?? "open"),
      )}
    >
      {statusLabel(flagStatus ?? "open")}
    </span>
  );
}

function ReferralMobileCard(props: ReferralRowProps) {
  const { row } = props;
  const flagStatus = row.flag_status ?? (row.flagged ? "open" : null);
  return (
    <div
      className={cn(
        "space-y-3",
        rowAccentClass(flagStatus, row.flagged),
        row.flagged && "rounded-lg p-1",
      )}
    >
      <MobileFieldRow label="Usuário">
        <div className="font-medium">{row.user_name}</div>
        <div className="mono text-[10px] text-muted-foreground">@{row.user_handle}</div>
        {row.cpf_last4 && (
          <div className="text-[10px] text-muted-foreground">
            {copy.admin.risk.cpfLast4}: •••{row.cpf_last4}
            {row.cpf_duplicate && (
              <span className="ml-1 text-warn">({copy.admin.risk.cpfDuplicate})</span>
            )}
          </div>
        )}
      </MobileFieldRow>
      <MobileFieldRow label="Afiliado">
        <div className="font-medium">{row.partner_handle ? `@${row.partner_handle}` : "—"}</div>
        <div className="text-[10px] text-muted-foreground">{row.partner_slug ?? ""}</div>
      </MobileFieldRow>
      <MobileFieldRow label="Depósito qualificado">
        <span className="mono">{formatBRL(Number(row.qualified_deposit_total ?? 0))}</span>
      </MobileFieldRow>
      <MobileFieldRow label="Status">
        <ReferralStatusBadge row={row} />
      </MobileFieldRow>
      <MobileFieldRow label="Ações">
        <ReferralActions {...props} />
      </MobileFieldRow>
    </div>
  );
}

function ReferralTable({
  title,
  rows,
  emptyText,
  ...rowProps
}: {
  title: string;
  rows: AdminCpaReferral[];
  emptyText: string;
} & Omit<ReferralRowProps, "row">) {
  return (
    <div className="rounded-xl border bg-card/60 p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <MobileDataList
        items={rows}
        keyFn={(r) => r.user_id}
        emptyText={emptyText}
        renderCard={(r) => <ReferralMobileCard row={r} {...rowProps} />}
      />
      <DesktopTableWrap>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[980px] text-xs">
            <thead className="border-b bg-surface/60 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Usuário</th>
                <th className="px-3 py-2 text-left">Afiliado</th>
                <th className="px-3 py-2 text-right">Depósito qualificado</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <ReferralRow key={r.user_id} row={r} {...rowProps} />
              ))}
            </tbody>
          </table>
        </div>
      </DesktopTableWrap>
      {!rows.length && <p className="mt-3 text-xs text-muted-foreground md:hidden">{emptyText}</p>}
    </div>
  );
}

function CaseMobileCard({ c }: { c: AdminCpaFraudCase }) {
  return (
    <div className={cn("space-y-3", rowAccentClass(c.status, true), "rounded-lg p-1")}>
      <MobileFieldRow label="Usuário">
        <div className="font-medium">{c.user_name}</div>
        <div className="mono text-[10px] text-muted-foreground">@{c.user_handle}</div>
      </MobileFieldRow>
      <MobileFieldRow label="Afiliado">
        <div className="font-medium">{c.partner_handle ? `@${c.partner_handle}` : "—"}</div>
        <div className="text-[10px] text-muted-foreground">{c.partner_slug ?? ""}</div>
      </MobileFieldRow>
      <MobileFieldRow label="Status">
        <span
          className={cn(
            "rounded border px-2 py-0.5 text-[10px] font-medium",
            statusBadgeClass(c.status),
          )}
        >
          {statusLabel(c.status)}
        </span>
        {c.is_cpa_counted && (
          <span className="mt-1 block text-[10px] text-muted-foreground">CPA contando</span>
        )}
      </MobileFieldRow>
      <MobileFieldRow label="Motivos">
        <span className="text-muted-foreground">{(c.reasons ?? []).join(", ") || "—"}</span>
      </MobileFieldRow>
      <MobileFieldRow label="Nota">
        <span className="text-muted-foreground">{c.notes ?? "—"}</span>
      </MobileFieldRow>
    </div>
  );
}

function CaseTable({
  title,
  cases,
  emptyText,
}: {
  title: string;
  cases: AdminCpaFraudCase[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border bg-card/60 p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <MobileDataList
        items={cases}
        keyFn={(c) => c.flag_id}
        emptyText={emptyText}
        renderCard={(c) => <CaseMobileCard c={c} />}
      />
      <DesktopTableWrap>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="border-b bg-surface/60 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Usuário</th>
                <th className="px-3 py-2 text-left">Afiliado</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Motivos</th>
                <th className="px-3 py-2 text-left">Nota</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr
                  key={c.flag_id}
                  className={cn("border-b border-border/40", rowAccentClass(c.status, true))}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.user_name}</div>
                    <div className="mono text-[10px] text-muted-foreground">@{c.user_handle}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {c.partner_handle ? `@${c.partner_handle}` : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{c.partner_slug ?? ""}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded border px-2 py-0.5 text-[10px] font-medium",
                        statusBadgeClass(c.status),
                      )}
                    >
                      {statusLabel(c.status)}
                    </span>
                    {c.is_cpa_counted && (
                      <span className="ml-2 text-[10px] text-muted-foreground">CPA contando</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground">
                    {(c.reasons ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground">{c.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DesktopTableWrap>
      {!cases.length && <p className="mt-3 text-xs text-muted-foreground md:hidden">{emptyText}</p>}
    </div>
  );
}

function AdminRiskPage() {
  const [tab, setTab] = useState<"alerts" | "cpa">("cpa");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [riskInput, setRiskInput] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [bulkActionNote, setBulkActionNote] = useState("");

  const { data: alerts, isError, refetch } = useAdminRiskAlerts(tab === "alerts");
  const {
    data: allCases,
    isError: isCpaCasesError,
    refetch: refetchCases,
  } = useAdminCpaFraudCases(undefined);
  const {
    data: referrals,
    isError: isReferralsError,
    refetch: refetchReferrals,
  } = useAdminCpaReferrals(onlyFlagged);

  const { mutateAsync: tagCase, isPending: tagging } = useAdminTagCpaFraudCase();
  const { mutateAsync: clearCases, isPending: clearing } = useAdminClearCpaFraudCases();
  const { mutateAsync: suspendPartners, isPending: suspending } = useAdminSuspendCpaFraudPartners();
  const { mutateAsync: banUsers, isPending: banning } = useAdminBanCpaFraudUsers();

  const openCases = useMemo(() => (allCases ?? []).filter((c) => c.status === "open"), [allCases]);
  const confirmedCases = useMemo(
    () => (allCases ?? []).filter((c) => c.status === "confirmed"),
    [allCases],
  );
  const archivedCases = useMemo(
    () => (allCases ?? []).filter((c) => c.status === "cleared" || c.status === "resolved"),
    [allCases],
  );

  const suspiciousReferrals = useMemo(
    () =>
      (referrals ?? []).filter((r) => r.flagged && (r.flag_status === "open" || !r.flag_status)),
    [referrals],
  );
  const confirmedReferrals = useMemo(
    () => (referrals ?? []).filter((r) => r.flagged && r.flag_status === "confirmed"),
    [referrals],
  );
  const untaggedReferrals = useMemo(() => (referrals ?? []).filter((r) => !r.flagged), [referrals]);

  const bulkNoteOk = bulkActionNote.trim().length >= MIN_ACTION_NOTE;
  const canRunDestructive = bulkNoteOk && confirmedCases.length > 0;

  if (isError || isCpaCasesError || isReferralsError) {
    return (
      <InlineError
        onRetry={() => {
          void refetch();
          void refetchCases();
          void refetchReferrals();
        }}
      />
    );
  }

  const handleTag = async (
    row: {
      user_id: string;
      partner_id?: string | null;
      flag_reasons?: string[];
      flag_risk_score?: number | null;
    },
    status: "open" | "confirmed" | "cleared" | "resolved",
  ) => {
    const note = (noteInput[row.user_id] ?? "").trim();
    if (status === "confirmed" && note.length < MIN_ACTION_NOTE) {
      toast.error(copy.admin.risk.confirmNoteRequired);
      return;
    }

    try {
      const scoreRaw = riskInput[row.user_id];
      const scoreFallback =
        row.flag_risk_score && row.flag_risk_score > 0 ? row.flag_risk_score : 60;
      const riskScore = scoreRaw ? Math.max(0, Math.min(100, Number(scoreRaw))) : scoreFallback;
      const autoReasons = row.flag_reasons?.length ? row.flag_reasons : [];
      await tagCase({
        userId: row.user_id,
        partnerId: row.partner_id ?? null,
        status,
        riskScore,
        reasons: autoReasons.length ? autoReasons : ["cpa_manual_review"],
        notes: note || undefined,
      });
      toast.success(
        status === "open"
          ? "Marcado como suspeito."
          : status === "confirmed"
            ? "Fraude confirmada."
            : status === "cleared"
              ? "Tag removida (limpo)."
              : "Caso resolvido.",
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao marcar caso");
    }
  };

  const requireBulkNote = () => {
    if (!bulkNoteOk) {
      toast.error(copy.admin.risk.actionNoteRequired);
      return false;
    }
    if (confirmedCases.length === 0) {
      toast.error(copy.admin.risk.destructiveRequiresConfirmed);
      return false;
    }
    return true;
  };

  const onClearCpas = async () => {
    if (!requireBulkNote()) return;
    try {
      const res = await clearCases({ actionNote: bulkActionNote.trim() });
      toast.success(`CPAs revertidos em ${res.reversed_cases} caso(s).`);
      setBulkActionNote("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao limpar CPAs");
    }
  };

  const onSuspendPartners = async () => {
    if (!requireBulkNote()) return;
    try {
      const res = await suspendPartners({ actionNote: bulkActionNote.trim() });
      toast.success(`Afiliados bloqueados: ${res.updated_partners}.`);
      setBulkActionNote("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao bloquear afiliados");
    }
  };

  const onBanUsers = async () => {
    if (!requireBulkNote()) return;
    const ok = window.confirm(
      `${copy.admin.risk.banUsersConfirm}\n\n${confirmedCases.length} conta(s).`,
    );
    if (!ok) return;
    try {
      const res = await banUsers({ actionNote: bulkActionNote.trim() });
      if (res.auth_ban_failed?.length) {
        toast.warning(
          `Banidas no app: ${res.banned_users}. Falha no Auth para ${res.auth_ban_failed.length} conta(s).`,
        );
      } else {
        toast.success(`Contas banidas: ${res.banned_users}.`);
      }
      setBulkActionNote("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao banir usuários");
    }
  };

  const referralRowProps = {
    riskInput,
    noteInput,
    onRiskChange: (userId: string, value: string) =>
      setRiskInput((prev) => ({ ...prev, [userId]: value })),
    onNoteChange: (userId: string, value: string) =>
      setNoteInput((prev) => ({ ...prev, [userId]: value })),
    onTag: handleTag,
    tagging,
    showConfirm: true,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.risk.title}</h1>
        <p className="text-xs text-muted-foreground">
          Heurísticas automáticas · CPA + Revenue Share · governança manual
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("cpa")}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs",
            tab === "cpa" ? "border-primary/40 bg-primary/10 text-primary" : "bg-card/60",
          )}
        >
          {copy.admin.risk.cpaTitle}
        </button>
        <button
          type="button"
          onClick={() => setTab("alerts")}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs",
            tab === "alerts" ? "border-primary/40 bg-primary/10 text-primary" : "bg-card/60",
          )}
        >
          Alertas gerais
        </button>
      </div>

      {tab === "alerts" && (
        <ul className="space-y-3">
          {(alerts ?? []).map((a, i) => (
            <li
              key={a.alert_id ?? `${a.user_id}-${i}`}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                a.severity === "medium" ? "border-warn/40 bg-warn/5" : "bg-card/60",
              )}
            >
              <p className="font-medium">{a.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.type} · {a.username ?? a.user_id}
              </p>
              {a.type === "deposit_cpf_mismatch" && (
                <div className="mt-2 space-y-1 rounded-lg border border-warn/30 bg-surface/60 p-2 text-xs">
                  <p>
                    <span className="text-muted-foreground">CPF perfil:</span>{" "}
                    <span className="mono font-medium">
                      {readMetaString(a.meta, "profile_cpf") ??
                        `***${readMetaString(a.meta, "profile_cpf_last4") ?? "—"}`}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">CPF pagador:</span>{" "}
                    <span className="mono font-medium">
                      {readMetaString(a.meta, "payer_cpf") ??
                        `***${readMetaString(a.meta, "payer_cpf_last4") ?? "—"}`}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Intent:</span>{" "}
                    <span className="mono">{readMetaString(a.meta, "intent_id") ?? "—"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Valor:</span>{" "}
                    <span className="mono">
                      {formatBRL(readMetaNumber(a.meta, "amount") ?? 0)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Provider ID:</span>{" "}
                    <span className="mono">{readMetaString(a.meta, "provider_id") ?? "—"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Evento provider:</span>{" "}
                    <span className="mono">
                      {readMetaString(a.meta, "provider_event_id") ??
                        readMetaString(a.meta, "transaction_id") ??
                        "—"}
                    </span>
                  </p>
                </div>
              )}
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
      )}

      {tab === "cpa" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-[10px] uppercase text-muted-foreground">
                {copy.admin.risk.statsOpen}
              </p>
              <p className="mt-1 text-2xl font-semibold mono">{openCases.length}</p>
            </div>
            <div className="rounded-xl border border-warn/40 bg-warn/5 p-4">
              <p className="text-[10px] uppercase text-muted-foreground">
                {copy.admin.risk.statsConfirmed}
              </p>
              <p className="mt-1 text-2xl font-semibold mono text-warn">{confirmedCases.length}</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <p className="text-xs text-muted-foreground">{copy.admin.risk.cpaSubtitle}</p>
            <p className="text-xs text-warn">{copy.admin.risk.destructiveRequiresConfirmed}</p>
            <label className="block text-xs">
              <span className="text-muted-foreground">{copy.admin.risk.actionNoteLabel}</span>
              <textarea
                value={bulkActionNote}
                onChange={(e) => setBulkActionNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5 text-xs"
                placeholder={copy.admin.risk.actionNoteHint}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={clearing || !canRunDestructive}
                onClick={onClearCpas}
                className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs text-warn disabled:opacity-50"
              >
                {copy.admin.risk.clearCpas}
              </button>
              <button
                type="button"
                disabled={suspending || !canRunDestructive}
                onClick={onSuspendPartners}
                className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary disabled:opacity-50"
              >
                {copy.admin.risk.suspendPartners}
              </button>
              <button
                type="button"
                disabled={banning || !canRunDestructive}
                onClick={onBanUsers}
                className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs text-danger disabled:opacity-50"
              >
                {copy.admin.risk.banUsers}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{copy.admin.risk.referralTitle}</h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyFlagged}
                onChange={(e) => setOnlyFlagged(e.target.checked)}
              />
              {copy.admin.risk.flaggedOnly}
            </label>
          </div>

          <ReferralTable
            title={copy.admin.risk.suspiciousSection}
            rows={suspiciousReferrals}
            emptyText={copy.admin.risk.noSuspicious}
            {...referralRowProps}
          />

          <ReferralTable
            title={copy.admin.risk.confirmedSection}
            rows={confirmedReferrals}
            emptyText={copy.admin.risk.noConfirmed}
            {...referralRowProps}
          />

          {!onlyFlagged && untaggedReferrals.length > 0 && (
            <ReferralTable
              title="Sem tag (triagem)"
              rows={untaggedReferrals}
              emptyText={copy.admin.risk.noReferrals}
              {...referralRowProps}
            />
          )}

          <CaseTable
            title={copy.admin.risk.suspiciousSection}
            cases={openCases}
            emptyText={copy.admin.risk.noSuspicious}
          />

          <CaseTable
            title={copy.admin.risk.confirmedSection}
            cases={confirmedCases}
            emptyText={copy.admin.risk.noConfirmed}
          />

          {archivedCases.length > 0 && (
            <CaseTable title="Arquivo (limpo / resolvido)" cases={archivedCases} emptyText="—" />
          )}
        </div>
      )}
    </div>
  );
}
