import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminInlineError } from "@/components/admin/admin-inline-error";
import { copy } from "@/copy/pt-BR";
import { useAdminUsers } from "@/hooks/use-admin-dashboard";
import {
  useAdminBonusLedger,
  useAdminBonusOverview,
  useAdminGrantUserBonus,
  useAdminUpdateSpinWeights,
  type CasinoSpinWeight,
} from "@/hooks/use-admin-bonuses";
import { useAdminPlatformSettings } from "@/hooks/use-admin-dashboard";
import { formatBRL } from "@/lib/parimutuel";
import { DesktopTableWrap, MobileDataList, MobileFieldRow } from "@/components/ui/responsive-table";

export const Route = createFileRoute("/admin/bonuses")({
  component: AdminBonusesPage,
});

const PERIOD_OPTIONS = [7, 30, 90] as const;

const KIND_LABELS: Record<string, string> = {
  bonus_tx: "Transação bônus",
  casino_spin: "Roleta",
  impulse_deposit: "Depósito impulsivo",
  admin_grant: "Concessão admin",
};

function AdminBonusesPage() {
  const [periodDays, setPeriodDays] = useState<(typeof PERIOD_OPTIONS)[number]>(30);
  const { data: overview, isLoading, isError, error, refetch } = useAdminBonusOverview(periodDays);
  const { data: ledger, refetch: refetchLedger } = useAdminBonusLedger();
  const { data: users } = useAdminUsers();
  const { data: settings } = useAdminPlatformSettings();
  const { mutateAsync: grant, isPending: granting } = useAdminGrantUserBonus();
  const { mutateAsync: saveWeights, isPending: savingWeights } = useAdminUpdateSpinWeights();

  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState("");
  const [grantKind, setGrantKind] = useState<"balance" | "xp">("balance");
  const [grantReason, setGrantReason] = useState("");
  const [spinWeights, setSpinWeights] = useState<CasinoSpinWeight[]>([]);

  const commonUsers = useMemo(
    () => (users ?? []).filter((u) => !u.is_admin && !u.is_partner),
    [users],
  );

  useEffect(() => {
    const raw = settings?.casino_spin_weights;
    if (Array.isArray(raw)) {
      setSpinWeights(raw as CasinoSpinWeight[]);
    }
  }, [settings]);

  if (isError) return <AdminInlineError error={error} onRetry={() => refetch()} />;

  const totalCash =
    Number(overview?.bonus_cash_total ?? 0) +
    Number(overview?.spin_cash_total ?? 0) +
    Number(overview?.impulse_cash_total ?? 0) +
    Number(overview?.admin_grants_cash ?? 0);

  const onGrant = async () => {
    const amount = Number(grantAmount);
    if (!grantUserId || !amount || amount <= 0) {
      toast.error("Selecione usuário e valor válido.");
      return;
    }
    try {
      await grant({
        userId: grantUserId,
        amount,
        kind: grantKind,
        reason: grantReason.trim() || undefined,
      });
      toast.success(grantKind === "balance" ? "Saldo concedido." : "XP concedido.");
      setGrantAmount("");
      setGrantReason("");
      refetchLedger();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao conceder.");
    }
  };

  const onSaveWeights = async () => {
    try {
      await saveWeights(spinWeights);
      toast.success("Pesos da roleta atualizados.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar pesos.");
    }
  };

  const updateWeight = (index: number, field: keyof CasinoSpinWeight, value: string | boolean) => {
    setSpinWeights((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === "near_miss") return { ...row, near_miss: Boolean(value) };
        if (field === "key") return { ...row, key: String(value) };
        return { ...row, [field]: Number(value) || 0 };
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{copy.admin.bonuses.title}</h1>
          <p className="text-xs text-muted-foreground">{copy.admin.bonuses.subtitle}</p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-surface/40 p-1">
          {PERIOD_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPeriodDays(d)}
              className={`rounded-md px-3 py-1 text-xs ${
                periodDays === d
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label={copy.admin.bonuses.totalCash}
          value={isLoading ? "…" : formatBRL(totalCash)}
          tone="up"
        />
        <AdminStatCard
          label={copy.admin.bonuses.spinCash}
          value={isLoading ? "…" : formatBRL(Number(overview?.spin_cash_total ?? 0))}
          sub={`${overview?.spin_count ?? 0} giros`}
        />
        <AdminStatCard
          label={copy.admin.bonuses.xpDistributed}
          value={
            isLoading
              ? "…"
              : String(
                  Number(overview?.spin_xp_total ?? 0) + Number(overview?.admin_grants_xp ?? 0),
                )
          }
        />
        <AdminStatCard
          label={copy.admin.bonuses.recipients}
          value={isLoading ? "…" : String(overview?.unique_recipients ?? 0)}
          sub={`${overview?.email_xp_claims_all_time ?? 0} e-mail XP (total)`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card/60 p-4 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {copy.admin.bonuses.grantTitle}
          </h2>
          <label className="block text-xs">
            <span className="text-muted-foreground">Usuário comum</span>
            <select
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
            >
              <option value="">Selecionar…</option>
              {commonUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} · {formatBRL(Number(u.balance))}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <label className="flex-1 text-xs">
              <span className="text-muted-foreground">Tipo</span>
              <select
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={grantKind}
                onChange={(e) => setGrantKind(e.target.value as "balance" | "xp")}
              >
                <option value="balance">Saldo (BRL)</option>
                <option value="xp">XP</option>
              </select>
            </label>
            <label className="flex-1 text-xs">
              <span className="text-muted-foreground">Valor</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm mono"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-xs">
            <span className="text-muted-foreground">Motivo (opcional)</span>
            <input
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="Ex.: campanha retenção"
            />
          </label>
          <button
            type="button"
            disabled={granting}
            onClick={onGrant}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {granting ? "Concedendo…" : copy.admin.bonuses.grantCta}
          </button>
        </div>

        <div className="rounded-xl border bg-card/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {copy.admin.bonuses.spinWeightsTitle}
            </h2>
            <button
              type="button"
              disabled={savingWeights || !spinWeights.length}
              onClick={onSaveWeights}
              className="rounded-md border px-2 py-1 text-[10px] uppercase tracking-wide disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        <div className="overflow-x-auto md:overflow-visible">
          <table className="w-full text-xs md:min-w-[420px]">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-1 text-left">Prêmio</th>
                  <th className="py-1 text-right">Peso</th>
                  <th className="py-1 text-right">BRL</th>
                  <th className="py-1 text-right">XP</th>
                  <th className="py-1 text-center">Near</th>
                </tr>
              </thead>
              <tbody>
                {spinWeights.map((row, i) => (
                  <tr key={row.key + i} className="border-t border-border/40">
                    <td className="py-1 pr-2">
                      <input
                        className="w-full rounded border bg-background px-1 py-0.5 mono text-[10px]"
                        value={row.key}
                        onChange={(e) => updateWeight(i, "key", e.target.value)}
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="number"
                        className="w-14 rounded border bg-background px-1 py-0.5 mono text-right"
                        value={row.weight}
                        onChange={(e) => updateWeight(i, "weight", e.target.value)}
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="number"
                        className="w-14 rounded border bg-background px-1 py-0.5 mono text-right"
                        value={row.balance}
                        onChange={(e) => updateWeight(i, "balance", e.target.value)}
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="number"
                        className="w-14 rounded border bg-background px-1 py-0.5 mono text-right"
                        value={row.xp}
                        onChange={(e) => updateWeight(i, "xp", e.target.value)}
                      />
                    </td>
                    <td className="py-1 text-center">
                      <input
                        type="checkbox"
                        checked={row.near_miss}
                        onChange={(e) => updateWeight(i, "near_miss", e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">{copy.admin.bonuses.spinWeightsHint}</p>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <div className="border-b bg-surface/60 px-4 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {copy.admin.bonuses.ledgerTitle}
          </h2>
        </div>
        <MobileDataList
          items={ledger ?? []}
          keyFn={(row) => `${row.kind}-${row.id}`}
          emptyText="Nenhum lançamento."
          renderCard={(row) => (
            <div className="space-y-2">
              <MobileFieldRow label="Quando">
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(row.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </MobileFieldRow>
              <MobileFieldRow label="Usuário">
                <span className="font-medium">{row.username}</span>
              </MobileFieldRow>
              <MobileFieldRow label="Canal">
                <span>{KIND_LABELS[row.kind] ?? row.kind}</span>
              </MobileFieldRow>
              <MobileFieldRow label="Detalhe">
                <span className="text-muted-foreground">
                  {row.label}
                  {row.source ? ` · ${row.source}` : ""}
                </span>
              </MobileFieldRow>
              <div className="flex justify-between gap-4 text-xs">
                <span className="text-muted-foreground">Cash</span>
                <span className="mono">
                  {Number(row.cash_amount) > 0 ? formatBRL(Number(row.cash_amount)) : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-xs">
                <span className="text-muted-foreground">XP</span>
                <span className="mono">{Number(row.xp_amount) > 0 ? row.xp_amount : "—"}</span>
              </div>
            </div>
          )}
        />
        <DesktopTableWrap>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="border-b bg-surface/40 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Quando</th>
                <th className="px-3 py-2 text-left">Usuário</th>
                <th className="px-3 py-2 text-left">Canal</th>
                <th className="px-3 py-2 text-left">Detalhe</th>
                <th className="px-3 py-2 text-right">Cash</th>
                <th className="px-3 py-2 text-right">XP</th>
              </tr>
            </thead>
            <tbody>
              {(ledger ?? []).map((row) => (
                <tr key={`${row.kind}-${row.id}`} className="border-b border-border/40">
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(row.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </td>
                  <td className="px-3 py-2 font-medium">{row.username}</td>
                  <td className="px-3 py-2">{KIND_LABELS[row.kind] ?? row.kind}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.label}
                    {row.source ? ` · ${row.source}` : ""}
                  </td>
                  <td className="px-3 py-2 text-right mono">
                    {Number(row.cash_amount) > 0 ? formatBRL(Number(row.cash_amount)) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right mono">
                    {Number(row.xp_amount) > 0 ? row.xp_amount : "—"}
                  </td>
                </tr>
              ))}
              {!ledger?.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhuma distribuição registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </DesktopTableWrap>
      </div>
    </div>
  );
}
