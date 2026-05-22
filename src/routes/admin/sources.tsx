import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAdminCameras,
  useAdminUpsertCamera,
  useAdminSetCameraStatus,
} from "@/hooks/use-admin-dashboard";
import { useRegions } from "@/hooks/use-regions";
import { useAdminOracleHealth } from "@/hooks/use-admin-dashboard";
import { copy } from "@/copy/pt-BR";
import { InlineError } from "@/components/viax/inline-error";
import { cn } from "@/lib/utils";
import { CameraLineEditor } from "@/components/admin/camera-line-editor";
import { CameraStreamPreview } from "@/components/admin/camera-stream-preview";
import { EmptyState } from "@/components/viax/empty-state";
import { Video } from "lucide-react";

export const Route = createFileRoute("/admin/sources")({
  component: AdminSourcesPage,
});

function AdminSourcesPage() {
  const { data: cameras, isError: camErr, refetch: refetchCam } = useAdminCameras();
  const { data: oracle } = useAdminOracleHealth();
  const { data: regions } = useRegions();
  const { mutateAsync: upsertCamera } = useAdminUpsertCamera();
  const { mutateAsync: setCameraStatus } = useAdminSetCameraStatus();
  const [name, setName] = useState("");
  const [regionId, setRegionId] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [countLine, setCountLine] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const onAddCamera = async () => {
    if (!name.trim() || !regionId) {
      toast.error("Nome e região obrigatórios");
      return;
    }
    try {
      await upsertCamera({
        p_id: null,
        p_region_id: regionId,
        p_name: name.trim(),
        p_status: "offline",
        p_stream_url: streamUrl.trim() || null,
        p_count_line: countLine,
      });
      toast.success("Câmera registrada.");
      setName("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  if (camErr) return <InlineError onRetry={() => refetchCam()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.sources.title}</h1>
        <p className="text-xs text-muted-foreground">Câmeras · sensores · regiões simuladas</p>
      </div>

      <div className="rounded-xl border bg-card/60 p-4">
        <h2 className="text-xs font-medium uppercase text-muted-foreground">
          {copy.admin.sources.synthetic}
        </h2>
        <ul className="mt-3 space-y-2 text-xs">
          {(oracle?.regions ?? []).map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span>{r.name}</span>
              <span className="text-up text-[10px]">ONLINE (sim)</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-card/60 p-4">
        <h2 className="mb-3 text-xs font-medium uppercase text-muted-foreground">
          {copy.admin.sources.cameras}
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da câmera"
            className="rounded-lg border bg-surface px-3 py-2 text-xs"
          />
          <input
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="URL stream (HLS/WebRTC)"
            className="min-w-[200px] flex-1 rounded-lg border bg-surface px-3 py-2 text-xs"
          />
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="rounded-lg border bg-surface px-3 py-2 text-xs"
          >
            <option value="">Região</option>
            {(regions ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onAddCamera}
            className="rounded-lg bg-primary px-4 py-2 text-xs text-primary-foreground"
          >
            {copy.admin.sources.addCamera}
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {(cameras ?? []).map((c) => (
            <li key={c.id} className="rounded-lg border px-3 py-3 text-xs">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                <span
                  className={cn(
                    "text-[10px] uppercase",
                    c.status === "online" ? "text-up" : "text-muted-foreground",
                  )}
                >
                  {c.status}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{c.location ?? c.region_id}</p>
              {c.stream_url && (
                <div className="mt-2 space-y-2">
                  <CameraStreamPreview url={c.stream_url} />
                  <a
                    href={c.stream_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-primary hover:underline"
                  >
                    {c.stream_url}
                  </a>
                </div>
              )}
              <div className="mt-2 flex gap-1">
                {(["online", "paused", "offline"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={async () => {
                      try {
                        await setCameraStatus({ cameraId: c.id, status: st });
                        toast.success(`Status: ${st}`);
                      } catch (e: unknown) {
                        toast.error(e instanceof Error ? e.message : "Erro");
                      }
                    }}
                    className={cn(
                      "rounded border px-2 py-0.5 text-[10px]",
                      c.status === st && "border-primary/50 bg-primary/10",
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
              {c.count_line != null && (
                <p className="mt-2 font-mono text-[10px] text-primary">
                  ── linha de contagem (JSON)
                </p>
              )}
            </li>
          ))}
          {!cameras?.length && (
            <EmptyState
              icon={Video}
              title="Nenhuma câmera cadastrada"
              description="Adicione nome, região e URL HLS ou snapshot HTTP acima."
              compact
            />
          )}
        </ul>
        <div className="mt-4">
          <CameraLineEditor value={countLine} onChange={setCountLine} />
        </div>
      </div>
    </div>
  );
}
