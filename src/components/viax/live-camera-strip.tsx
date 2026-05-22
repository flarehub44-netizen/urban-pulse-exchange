import { CameraPlayer } from "@/components/viax/camera-player";
import { useLiveCameras, useRegionCameraStatus } from "@/hooks/use-live-cameras";
import { copy } from "@/copy/pt-BR";
import { Video } from "lucide-react";
import { InlineError } from "@/components/viax/inline-error";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function LiveCameraStrip({ regionId }: { regionId: string | null | undefined }) {
  const { data: cameras, isLoading, isError, refetch } = useLiveCameras(regionId);
  const { data: status } = useRegionCameraStatus(regionId);

  if (!regionId) return null;

  if (isError) {
    return <InlineError message={copy.cameras.streamError} onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card/60 p-4 text-xs text-muted-foreground animate-pulse">
        {copy.cameras.liveTitle}…
      </div>
    );
  }

  if (!cameras?.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-card/40 p-4 text-center text-xs text-muted-foreground">
        <Video className="mx-auto mb-2 size-5 opacity-50" />
        {copy.cameras.noSignal}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-card/60 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{copy.cameras.liveTitle}</h3>
          <p className="text-[10px] text-muted-foreground">{copy.cameras.liveSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status && status.detecting_count > 0 && (
            <span className="rounded-md border border-up/30 bg-up/10 px-2 py-0.5 text-[10px] text-up">
              UrbanMind · {status.detecting_count} detecção ativa
            </span>
          )}
          {status?.last_reading_at && (
            <span className="text-[10px] text-muted-foreground">
              {copy.cameras.lastReading}:{" "}
              {formatDistanceToNow(new Date(status.last_reading_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cameras.map((cam) => (
          <div key={cam.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{cam.name}</span>
              {cam.detection_ok ? (
                <span className="text-[10px] text-up">● detecção</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">aguardando</span>
              )}
            </div>
            <CameraPlayer url={cam.stream_url} maxHeightClass="max-h-40" />
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">{copy.cameras.privacyNote}</p>
    </div>
  );
}
