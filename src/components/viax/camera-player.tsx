import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { classifyStreamUrl, isInsecureStreamInProd } from "@/lib/camera-stream-url";
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
  const hlsRef = useRef<{ destroy: () => void; loadSource: (s: string) => void } | null>(null);
  const retriedRef = useRef(false);
  const [hlsError, setHlsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const insecureProd = useMemo(() => isInsecureStreamInProd(url), [url]);
  const kind = useMemo(() => classifyStreamUrl(url), [url]);

  useEffect(() => {
    if (offline || insecureProd || kind !== "hls") return;

    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    retriedRef.current = false;

    const attachHls = async (HlsMod: typeof import("hls.js").default) => {
      if (cancelled) return;
      if (!HlsMod.isSupported()) {
        setHlsError(copy.cameras.hlsUnsupported);
        setLoading(false);
        return;
      }

      hlsRef.current?.destroy();
      const instance = new HlsMod({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        backBufferLength: 10,
      });
      hlsRef.current = instance;

      // Snap to live edge if user/playback drifts behind
      const snapToLive = () => {
        if (!instance.liveSyncPosition) return;
        const drift = instance.liveSyncPosition - video.currentTime;
        if (drift > 8) video.currentTime = instance.liveSyncPosition;
      };
      video.addEventListener("playing", snapToLive);

      instance.loadSource(url);
      instance.attachMedia(video);

      instance.on(HlsMod.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        setHlsError(null);
        if (autoPlay) void video.play().catch(() => undefined);
      });

      instance.on(HlsMod.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;

        if (data.type === HlsMod.ErrorTypes.NETWORK_ERROR && !retriedRef.current) {
          retriedRef.current = true;
          instance.startLoad();
          return;
        }

        setHlsError(copy.cameras.streamError);
        setLoading(false);
      });
    };

    const setup = async () => {
      setLoading(true);
      setHlsError(null);

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        const onLoaded = () => {
          setLoading(false);
          if (autoPlay) void video.play().catch(() => undefined);
        };
        video.addEventListener("loadeddata", onLoaded, { once: true });
        video.addEventListener(
          "error",
          () => {
            setHlsError(copy.cameras.streamError);
            setLoading(false);
          },
          { once: true },
        );
        return;
      }

      try {
        const Hls = (await import("hls.js")).default;
        await attachHls(Hls);
      } catch {
        setHlsError(copy.cameras.streamError);
        setLoading(false);
      }
    };

    void setup();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [url, kind, autoPlay, offline, insecureProd]);

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

  if (insecureProd) {
    return (
      <div
        className={cn(
          "rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <p>{copy.cameras.mixedContent}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
        >
          <ExternalLink className="size-3" />
          {copy.cameras.openExternal}
        </a>
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
      <div className={cn("space-y-1", className)}>
        <div className="relative overflow-hidden rounded-lg border bg-black/80">
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
          {hlsError && (
            <div className="space-y-1 px-2 py-1">
              <p className="text-[10px] text-warn">{hlsError}</p>
              <p className="text-[10px] text-muted-foreground">{copy.cameras.corsHint}</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <ExternalLink className="size-3" />
                {copy.cameras.openExternal}
              </a>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{copy.cameras.privacyNote}</p>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <SnapshotImage
        url={url}
        autoPlay={autoPlay && !offline}
        className={className}
        maxHeightClass={maxHeightClass}
        onError={() => setHlsError(copy.cameras.streamError)}
        onLoad={() => setLoading(false)}
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

type SnapshotImageProps = {
  url: string;
  autoPlay: boolean;
  className?: string;
  maxHeightClass: string;
  onLoad: () => void;
  onError: () => void;
};

function SnapshotImage({
  url,
  autoPlay,
  className,
  maxHeightClass,
  onLoad,
  onError,
}: SnapshotImageProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, [autoPlay]);

  const sep = url.includes("?") ? "&" : "?";
  const src = `${url}${sep}t=${tick}`;

  return (
    <div className={cn("relative", className)}>
      <img
        src={src}
        alt={copy.cameras.previewAlt}
        className={cn("aspect-video w-full rounded-lg border object-cover", maxHeightClass)}
        onLoad={onLoad}
        onError={onError}
      />
      {autoPlay ? (
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
          <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
          AO VIVO
        </span>
      ) : null}
    </div>
  );
}
