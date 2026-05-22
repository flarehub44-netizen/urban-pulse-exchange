import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  useAdminPlatformSettings,
  useAdminUpdateSetting,
} from "@/hooks/use-admin-dashboard";
import { copy } from "@/copy/pt-BR";
import { InlineError } from "@/components/viax/inline-error";
import { AdminAuditLog } from "@/components/admin/admin-audit-log";

export const Route = createFileRoute("/admin/system")({
  component: AdminSystemPage,
});

function AdminSystemPage() {
  const { data: settings, isError, refetch } = useAdminPlatformSettings();
  const { mutateAsync: update, isPending } = useAdminUpdateSetting();
  const [fee, setFee] = useState("0.10");
  const [maxStake, setMaxStake] = useState("100000");

  useEffect(() => {
    if (!settings) return;
    if (settings.house_fee_rate != null) setFee(String(settings.house_fee_rate));
    if (settings.max_stake != null) setMaxStake(String(settings.max_stake));
  }, [settings]);

  if (isError) return <InlineError onRetry={() => refetch()} />;

  const onSave = async () => {
    try {
      await update({ key: "house_fee_rate", value: Number(fee) });
      await update({ key: "max_stake", value: Number(maxStake) });
      toast.success("Configurações salvas.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.system.title}</h1>
        <p className="text-xs text-muted-foreground">Taxa · limites · regiões</p>
      </div>

      <div className="space-y-4 rounded-xl border bg-card/60 p-4 text-sm">
        <label className="block">
          <span className="text-xs text-muted-foreground">Taxa da plataforma (0–1)</span>
          <input
            type="number"
            step="0.01"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 mono"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Aposta máxima (R$)</span>
          <input
            type="number"
            value={maxStake}
            onChange={(e) => setMaxStake(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 mono"
          />
        </label>
        <button
          type="button"
          disabled={isPending}
          onClick={onSave}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {copy.admin.system.save}
        </button>
      </div>

      <AdminAuditLog limit={40} />
    </div>
  );
}
