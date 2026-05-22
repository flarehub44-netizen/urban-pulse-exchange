import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { classifyStreamUrl } from "@/lib/camera-stream-url";
import { copy } from "@/copy/pt-BR";

type CameraPlayerProps = {
  url: string;
  className?: string;
  autoPlay?: boolean;
  maxHeightClass?: string;
  offline?: boolean;
};

export function CameraPlayer({
  url,
  className,
  autoPlay = true,
  maxHeightClass = "max-h-48",
  offline = false,
}: CameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsError, setHlsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const kind = useMemo(() => classifyStreamUrl(url), [url]);

  useEffect(() => {
    if (offline || kind !== "hls") return;

    const video = videoRef.current;
    if (!video) return;

    let hls: { destroy: () => void } | null = null;
    let cancelled = false;

    const setup = async () => {
      setLoading(true);
      setHlsError(null);

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        setLoading(false);
        return;
      }

      try {
        const Hls = (await import("hls.js")).default;
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setHlsError(copy.cameras.hlsUnsupported);
          setLoading(false);
          return;
        }
        const instance = new Hls({ enableWorker: true, lowLatencyMode: true });
        instance.loadSource(url);
        instance.attachMedia(video);
        instance.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            setHlsError(copy.cameras.streamError);
            setLoading(false);
          }
        });
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          if (autoPlay) void video.play().catch(() => undefined);
        });
        hls = instance;
      } catch {
        setHlsError(copy.cameras.streamError);
        setLoading(false);
      }
    };

    void setup();

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [url, kind, autoPlay, offline]);

  if (offline) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center gap-2 rounded-lg border bg-muted/30 text-xs text-muted-foreground",
          maxHeightClass,
          className,
        )}
      >
        <VideoOff className="size-4" />
        {copy.cameras.offline}
      </div>
    );
  }

  if (kind === "unsupported") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <Video className="size-4 shrink-0 text-warn" />
        {copy.cameras.rtspHint}
      </div>
    );
  }

  if (kind === "hls") {
    return (
      <div className={cn("relative overflow-hidden rounded-lg border bg-black/80", className)}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <video
          ref={videoRef}
          controls
          playsInline
          muted
          className={cn("aspect-video w-full object-contain", maxHeightClass)}
        />
        {hlsError && <p className="px-2 py-1 text-[10px] text-warn">{hlsError}</p>}
      </div>
    );
  }

  if (kind === "image") {
    return (
      <img
        src={url}
        alt={copy.cameras.previewAlt}
        className={cn("aspect-video w-full rounded-lg border object-cover", maxHeightClass, className)}
        onLoad={() => setLoading(false)}
        onError={() => setHlsError(copy.cameras.streamError)}
      />
    );
  }

  if (typeof kind === "object" && kind.type === "embed") {
    return (
      <iframe
        title={copy.cameras.previewAlt}
        src={kind.src}
        className={cn("aspect-video w-full rounded-lg border", maxHeightClass, className)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-primary hover:underline",
        className,
      )}
    >
      <ExternalLink className="size-3.5" />
      {copy.cameras.openExternal}
    </a>
  );
}
