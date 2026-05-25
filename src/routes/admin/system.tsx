import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAdminPlatformSettings, useAdminUpdateSetting } from "@/hooks/use-admin-dashboard";
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
  const [casinoEnabled, setCasinoEnabled] = useState(true);
  const [impulseMax, setImpulseMax] = useState("3");
  const [partnerEnabled, setPartnerEnabled] = useState(true);
  const [partnerShare, setPartnerShare] = useState("0.20");
  const [defaultCpa, setDefaultCpa] = useState("25");
  const [cpaMinDeposit, setCpaMinDeposit] = useState("50");
  const [cameraOracleEnabled, setCameraOracleEnabled] = useState(false);
  const [regionsSimulatorEnabled, setRegionsSimulatorEnabled] = useState(true);

  useEffect(() => {
    if (!settings) return;
    if (settings.house_fee_rate != null) setFee(String(settings.house_fee_rate));
    if (settings.max_stake != null) setMaxStake(String(settings.max_stake));
    if (settings.casino_enabled != null) setCasinoEnabled(Boolean(settings.casino_enabled));
    if (settings.casino_impulse_max_per_hour != null) {
      setImpulseMax(String(settings.casino_impulse_max_per_hour));
    }
    if (settings.partner_program_enabled != null) {
      setPartnerEnabled(Boolean(settings.partner_program_enabled));
    }
    if (settings.default_revenue_share_pct != null) {
      setPartnerShare(String(settings.default_revenue_share_pct));
    }
    if (settings.default_cpa_amount != null) {
      setDefaultCpa(String(settings.default_cpa_amount));
    }
    if (settings.cpa_min_deposit_threshold != null) {
      setCpaMinDeposit(String(settings.cpa_min_deposit_threshold));
    }
    if (settings.camera_oracle_enabled != null) {
      setCameraOracleEnabled(Boolean(settings.camera_oracle_enabled));
    }
    if (settings.regions_simulator_enabled != null) {
      setRegionsSimulatorEnabled(Boolean(settings.regions_simulator_enabled));
    }
  }, [settings]);

  if (isError) return <InlineError onRetry={() => refetch()} />;

  const onSave = async () => {
    try {
      await update({ key: "house_fee_rate", value: Number(fee) });
      await update({ key: "max_stake", value: Number(maxStake) });
      await update({ key: "casino_enabled", value: casinoEnabled });
      await update({ key: "casino_impulse_max_per_hour", value: Number(impulseMax) });
      await update({ key: "partner_program_enabled", value: partnerEnabled });
      await update({ key: "default_revenue_share_pct", value: Number(partnerShare) });
      await update({ key: "default_cpa_amount", value: Number(defaultCpa) });
      await update({ key: "cpa_min_deposit_threshold", value: Number(cpaMinDeposit) });
      await update({ key: "camera_oracle_enabled", value: cameraOracleEnabled });
      await update({ key: "regions_simulator_enabled", value: regionsSimulatorEnabled });
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
          <span className="text-xs text-muted-foreground">{copy.admin.system.maxStake}</span>
          <input
            type="number"
            value={maxStake}
            onChange={(e) => setMaxStake(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 mono"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={casinoEnabled}
            onChange={(e) => setCasinoEnabled(e.target.checked)}
          />
          <span className="text-xs">{copy.admin.system.casinoEnabled}</span>
        </label>
        <p className="text-[11px] text-muted-foreground">{copy.admin.system.casinoEnabledHint}</p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={partnerEnabled}
            onChange={(e) => setPartnerEnabled(e.target.checked)}
          />
          <span className="text-xs">Programa Creator ativo</span>
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Revenue share padrão (0–1)</span>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={partnerShare}
            onChange={(e) => setPartnerShare(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 mono"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">{copy.admin.system.defaultCpa}</span>
          <input
            type="number"
            min={0}
            step="1"
            value={defaultCpa}
            onChange={(e) => setDefaultCpa(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 mono"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">{copy.admin.system.cpaMinDeposit}</span>
          <input
            type="number"
            min={0}
            step="1"
            value={cpaMinDeposit}
            onChange={(e) => setCpaMinDeposit(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 mono"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cameraOracleEnabled}
            onChange={(e) => setCameraOracleEnabled(e.target.checked)}
          />
          <span className="text-xs">Oráculo por câmera (data_source=camera)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={regionsSimulatorEnabled}
            onChange={(e) => setRegionsSimulatorEnabled(e.target.checked)}
          />
          <span className="text-xs">Simulador de regiões (pg_cron)</span>
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">{copy.admin.system.impulseMaxHour}</span>
          <input
            type="number"
            min={1}
            max={10}
            value={impulseMax}
            onChange={(e) => setImpulseMax(e.target.value)}
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
