import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";
import { useRegions } from "@/hooks/use-regions";
import {
  useAdminTrafficTemplates,
  useAdminTrafficScheduler,
  useAdminUpsertTrafficTemplate,
  useAdminTestTrafficTemplate,
  useAdminSetTrafficTemplateReady,
  useAdminUpdateTrafficScheduler,
  useAdminDeleteTrafficTemplate,
  type TrafficEventTemplate,
} from "@/hooks/use-admin-traffic-events";
import { CameraStreamPreview } from "@/components/admin/camera-stream-preview";
import { MARKET_CATEGORY_FILTERS } from "@/lib/markets-catalog";
import type { Market } from "@/store/viax-store";

export const Route = createFileRoute("/admin/traffic-events")({
  component: AdminTrafficEventsPage,
});

const emptyForm = {
  id: "",
  name: "",
  question: "",
  region_id: "",
  target: "5000",
  category: "Fluxo" as Market["category"],
  data_source: "regions",
  camera_id: "",
  active: true,
};

function AdminTrafficEventsPage() {
  const { data: templates, isLoading } = useAdminTrafficTemplates();
  const { data: scheduler } = useAdminTrafficScheduler();
  const { data: regions } = useRegions();
  const upsert = useAdminUpsertTrafficTemplate();
  const testCam = useAdminTestTrafficTemplate();
  const setReady = useAdminSetTrafficTemplateReady();
  const updateScheduler = useAdminUpdateTrafficScheduler();
  const deleteTemplate = useAdminDeleteTrafficTemplate();

  const [form, setForm] = useState(emptyForm);
  const [testCameras, setTestCameras] = useState<
    { id: string; name: string; stream_url: string | null; detection_ok: boolean }[]
  >([]);
  const [durationSec, setDurationSec] = useState("60");
  const [gapSec, setGapSec] = useState("900");

  useEffect(() => {
    if (!scheduler) return;
    const parseSec = (interval: string) => {
      const m = interval.match(/(\d+):(\d+):(\d+)/);
      if (!m) return 60;
      return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    };
    setDurationSec(String(parseSec(scheduler.event_duration)));
    setGapSec(String(parseSec(scheduler.gap_after_end)));
  }, [scheduler]);

  const regionName = (id: string | null) =>
    regions?.find((r) => r.id === id)?.name ?? id ?? "—";

  const loadTemplate = (t: TrafficEventTemplate) => {
    setForm({
      id: t.id,
      name: t.name,
      question: t.question,
      region_id: t.region_id ?? "",
      target: String(t.target),
      category: t.category as Market["category"],
      data_source: t.data_source,
      camera_id: t.camera_id ?? "",
      active: t.active,
    });
    setTestCameras([]);
  };

  const onSave = async () => {
    const region = regions?.find((r) => r.id === form.region_id);
    if (!region) {
      toast.error(copy.settings.adminCreateNeedRegion);
      return;
    }
    try {
      await upsert.mutateAsync({
        id: form.id || undefined,
        name: form.name || form.question.slice(0, 80),
        question: form.question,
        region: region.name,
        region_id: form.region_id,
        target: Number(form.target),
        category: form.category,
        data_source: form.data_source,
        camera_id: form.camera_id || null,
        active: form.active,
        ready: false,
      });
      toast.success(copy.admin.trafficEvents.saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const onTest = async () => {
    if (!form.id) {
      toast.error("Salve o template antes de testar a câmera.");
      return;
    }
    try {
      const res = await testCam.mutateAsync(form.id);
      setTestCameras(
        (res.cameras ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          stream_url: c.stream_url,
          detection_ok: c.detection_ok,
        })),
      );
      if (!res.cameras?.length) toast.warning(copy.admin.trafficEvents.noCameras);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no teste");
    }
  };

  const onSchedulerSave = async () => {
    try {
      await updateScheduler.mutateAsync({
        event_duration_seconds: Number(durationSec),
        gap_after_end_seconds: Number(gapSec),
      });
      toast.success(copy.admin.trafficEvents.schedulerSaved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onDelete = async (templateId: string) => {
    const confirmed = window.confirm(copy.admin.trafficEvents.deleteConfirm);
    if (!confirmed) return;
    try {
      await deleteTemplate.mutateAsync(templateId);
      if (form.id === templateId) {
        setForm(emptyForm);
        setTestCameras([]);
      }
      toast.success(copy.admin.trafficEvents.deleteDone);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">{copy.admin.trafficEvents.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.admin.trafficEvents.subtitle}</p>
      </div>

      <section className="rounded-xl border bg-card/40 p-4">
        <h2 className="text-sm font-medium">{copy.admin.trafficEvents.schedulerTitle}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs">
            {copy.admin.trafficEvents.durationLabel}
            <input
              type="number"
              min={30}
              value={durationSec}
              onChange={(e) => setDurationSec(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs">
            {copy.admin.trafficEvents.gapLabel}
            <input
              type="number"
              min={60}
              value={gapSec}
              onChange={(e) => setGapSec(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <div className="text-xs text-muted-foreground sm:col-span-2">
            <p>
              {copy.admin.trafficEvents.nextStarts}:{" "}
              {scheduler?.next_starts_at
                ? format(new Date(scheduler.next_starts_at), "dd/MM HH:mm", { locale: ptBR })
                : "—"}
            </p>
            <p>
              {copy.admin.trafficEvents.currentSlot}:{" "}
              {scheduler?.current_market_id ? (
                <Link
                  to="/markets/$marketId"
                  params={{ marketId: scheduler.current_market_id }}
                  className="text-primary hover:underline"
                >
                  {scheduler.current_market_id}
                </Link>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onSchedulerSave()}
          disabled={updateScheduler.isPending}
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {copy.admin.trafficEvents.saveScheduler}
        </button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-xl border bg-card/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              {form.id ? copy.admin.trafficEvents.editTemplate : copy.admin.trafficEvents.newTemplate}
            </h2>
            {form.id && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setForm(emptyForm)}
              >
                Limpar
              </button>
            )}
          </div>
          <div className="space-y-3">
            <label className="block text-xs">
              {copy.admin.trafficEvents.nameLabel}
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              {copy.admin.trafficEvents.questionLabel}
              <textarea
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                required
                rows={2}
                className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {copy.admin.trafficEvents.regionLabel}
                <select
                  value={form.region_id}
                  onChange={(e) => setForm((f) => ({ ...f, region_id: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {(regions ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                {copy.admin.trafficEvents.categoryLabel}
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as Market["category"] }))
                  }
                  className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
                >
                  {MARKET_CATEGORY_FILTERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs">
              {copy.admin.trafficEvents.targetLabel}
              <input
                type="number"
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              {copy.admin.trafficEvents.dataSourceLabel}
              <select
                value={form.data_source}
                onChange={(e) => setForm((f) => ({ ...f, data_source: e.target.value }))}
                className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
              >
                <option value="regions">regions</option>
                <option value="camera">camera</option>
                <option value="manual">manual</option>
              </select>
            </label>
            <label className="block text-xs">
              {copy.admin.trafficEvents.cameraLabel}
              <input
                value={form.camera_id}
                onChange={(e) => setForm((f) => ({ ...f, camera_id: e.target.value }))}
                placeholder="UUID da câmera"
                className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm font-mono text-xs"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={upsert.isPending || !form.question.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              {copy.admin.trafficEvents.save}
            </button>
            <button
              type="button"
              onClick={() => void onTest()}
              disabled={testCam.isPending || !form.id}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              {copy.admin.trafficEvents.testCamera}
            </button>
          </div>
          {testCameras.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {testCameras.map((c) => (
                <div key={c.id} className="rounded-lg border p-2">
                  <p className="text-xs font-medium">{c.name}</p>
                  {c.stream_url ? (
                    <CameraStreamPreview url={c.stream_url} className="mt-2" />
                  ) : (
                    <p className="mt-2 text-xs text-warn">Sem stream_url</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    detection: {c.detection_ok ? "ok" : "falha"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card/40 p-4">
          <h2 className="text-sm font-medium">Templates ({templates?.length ?? 0})</h2>
          {isLoading && <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && !templates?.length && (
            <p className="mt-4 text-sm text-muted-foreground">{copy.admin.trafficEvents.empty}</p>
          )}
          <ul className="mt-3 max-h-[70vh] space-y-2 overflow-auto">
            {(templates ?? []).map((t) => (
              <li
                key={t.id}
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  form.id === t.id && "border-primary/50 bg-primary/5",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    className="text-left font-medium hover:text-primary"
                    onClick={() => loadTemplate(t)}
                  >
                    {t.question.slice(0, 72)}
                    {t.question.length > 72 ? "…" : ""}
                  </button>
                  <div className="flex flex-wrap gap-1">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] uppercase",
                        t.ready ? "bg-up/15 text-up" : "bg-warn/15 text-warn",
                      )}
                    >
                      {t.ready ? copy.admin.trafficEvents.ready : copy.admin.trafficEvents.notReady}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] uppercase",
                        t.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {t.active ? copy.admin.trafficEvents.active : copy.admin.trafficEvents.inactive}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {regionName(t.region_id)} · {t.category}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() =>
                      void setReady
                        .mutateAsync({ id: t.id, ready: !t.ready })
                        .then(() =>
                          toast.success(
                            t.ready
                              ? copy.admin.trafficEvents.readyRevoked
                              : copy.admin.trafficEvents.readyDone,
                          ),
                        )
                    }
                  >
                    {t.ready
                      ? copy.admin.trafficEvents.revokeReady
                      : copy.admin.trafficEvents.approveReady}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() =>
                      void upsert
                        .mutateAsync({ id: t.id, active: !t.active })
                        .then(() => toast.success("Status atualizado"))
                    }
                  >
                    {t.active
                      ? copy.admin.trafficEvents.deactivate
                      : copy.admin.trafficEvents.activate}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-down hover:underline disabled:opacity-60"
                    disabled={deleteTemplate.isPending}
                    onClick={() => void onDelete(t.id)}
                  >
                    {copy.admin.trafficEvents.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
