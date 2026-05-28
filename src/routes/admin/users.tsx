import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAdminUsers,
  useAdminFreezeAccount,
  useAdminSetBetLimit,
  useAdminUpdateKyc,
} from "@/hooks/use-admin-dashboard";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { AdminInlineError } from "@/components/admin/admin-inline-error";
import { DesktopTableWrap, MobileDataList, MobileFieldRow } from "@/components/ui/responsive-table";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { data: users, isError, error, refetch } = useAdminUsers();
  const { mutateAsync: freeze } = useAdminFreezeAccount();
  const { mutateAsync: setLimit } = useAdminSetBetLimit();
  const { mutateAsync: updateKyc } = useAdminUpdateKyc();
  const [limitInput, setLimitInput] = useState<Record<string, string>>({});

  if (isError) return <AdminInlineError error={error} onRetry={() => refetch()} />;

  const onFreeze = async (userId: string, frozen: boolean) => {
    try {
      await freeze({ userId, frozen });
      toast.success(frozen ? "Conta congelada." : "Conta descongelada.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onSetLimit = async (userId: string) => {
    const v = Number(limitInput[userId]);
    if (!v || v < 0) return;
    try {
      await setLimit({ userId, limit: v });
      toast.success("Limite atualizado.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.nav.users}</h1>
        <p className="text-xs text-muted-foreground">Usuários · KYC · limites</p>
      </div>

      <MobileDataList
        items={users ?? []}
        keyFn={(u) => u.id}
        emptyText="Nenhum usuário."
        renderCard={(u) => (
          <div className="space-y-3">
            <MobileFieldRow label="Usuário">
              <span className="font-medium">{u.username}</span>
              {u.is_admin && <span className="ml-2 text-[10px] text-primary">admin</span>}
            </MobileFieldRow>
            <MobileFieldRow label="Afiliado">
              {u.is_partner ? (
                <span className="text-[10px] text-primary">{copy.admin.partnerBadge}</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">—</span>
              )}
            </MobileFieldRow>
            <MobileFieldRow label="Volume">
              <span className="mono">{formatBRL(Number(u.volume))}</span>
            </MobileFieldRow>
            <MobileFieldRow label="KYC">
              <select
                value={u.kyc_status}
                onChange={async (e) => {
                  try {
                    await updateKyc({ userId: u.id, status: e.target.value });
                    toast.success("KYC atualizado.");
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : "Erro");
                  }
                }}
                className="w-full rounded border bg-surface px-2 py-2 text-xs"
              >
                {["none", "pending", "verified", "rejected"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </MobileFieldRow>
            <MobileFieldRow label="Risco">
              <span className="mono">{u.risk_score}</span>
            </MobileFieldRow>
            <MobileFieldRow label="Ações">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onFreeze(u.id, !u.frozen)}
                  className="min-h-[44px] rounded border px-3 py-2 text-xs"
                >
                  {u.frozen ? copy.admin.users.unfreeze : copy.admin.users.freeze}
                </button>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Limite"
                    value={limitInput[u.id] ?? ""}
                    onChange={(e) => setLimitInput((s) => ({ ...s, [u.id]: e.target.value }))}
                    className="min-w-0 flex-1 rounded border bg-surface px-2 py-2 mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => onSetLimit(u.id)}
                    className="min-h-[44px] shrink-0 rounded border border-primary/40 px-3 py-2 text-xs text-primary"
                  >
                    {copy.admin.users.betLimit}
                  </button>
                </div>
              </div>
            </MobileFieldRow>
          </div>
        )}
      />
      <DesktopTableWrap>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-xs">
          <thead className="border-b bg-surface/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Usuário</th>
              <th className="px-3 py-2 text-left">Afiliado</th>
              <th className="px-3 py-2 text-right">Volume</th>
              <th className="px-3 py-2 text-left">KYC</th>
              <th className="px-3 py-2 text-left">Risco</th>
              <th className="px-3 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-b border-border/40">
                <td className="px-3 py-2">
                  <span className="font-medium">{u.username}</span>
                  {u.is_admin && <span className="ml-2 text-[10px] text-primary">admin</span>}
                </td>
                <td className="px-3 py-2">
                  {u.is_partner ? (
                    <span className="text-[10px] text-primary">{copy.admin.partnerBadge}</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right mono">{formatBRL(Number(u.volume))}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.kyc_status}
                    onChange={async (e) => {
                      try {
                        await updateKyc({ userId: u.id, status: e.target.value });
                        toast.success("KYC atualizado.");
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Erro");
                      }
                    }}
                    className="rounded border bg-surface px-1 py-0.5 text-[10px]"
                  >
                    {["none", "pending", "verified", "rejected"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 mono">{u.risk_score}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onFreeze(u.id, !u.frozen)}
                      className="rounded border px-2 py-0.5 text-[10px]"
                    >
                      {u.frozen ? copy.admin.users.unfreeze : copy.admin.users.freeze}
                    </button>
                    <input
                      type="number"
                      placeholder="Limite"
                      value={limitInput[u.id] ?? ""}
                      onChange={(e) => setLimitInput((s) => ({ ...s, [u.id]: e.target.value }))}
                      className="w-20 rounded border bg-surface px-1 py-0.5 mono text-[10px]"
                    />
                    <button
                      type="button"
                      onClick={() => onSetLimit(u.id)}
                      className="rounded border border-primary/40 px-2 py-0.5 text-[10px] text-primary"
                    >
                      {copy.admin.users.betLimit}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </DesktopTableWrap>
    </div>
  );
}
