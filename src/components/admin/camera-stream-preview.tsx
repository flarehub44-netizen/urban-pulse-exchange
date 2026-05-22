import { useMemo } from "react";
import { ExternalLink, Video } from "lucide-react";
import { cn } from "@/lib/utils";

function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function CameraStreamPreview({ url, className }: { url: string; className?: string }) {
  const kind = useMemo(() => {
    const lower = url.toLowerCase();
    if (lower.includes(".m3u8") || lower.includes("mpegurl")) return "hls" as const;
    if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower) || /snapshot|frame|shot/i.test(lower))
      return "image" as const;
    const yt = youtubeEmbed(url);
    if (yt) return { type: "embed" as const, src: yt };
    if (lower.startsWith("rtsp://") || lower.startsWith("rtmp://")) return "unsupported" as const;
    return "link" as const;
  }, [url]);

  if (kind === "hls") {
    return (
      <div className={cn("overflow-hidden rounded-lg border bg-black/80", className)}>
        <video
          src={url}
          controls
          playsInline
          muted
          className="aspect-video w-full max-h-48 object-contain"
        />
        <p className="px-2 py-1 text-[10px] text-muted-foreground">
          HLS nativo (Safari/iOS). Outros navegadores: abra o link.
        </p>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <img
        src={url}
        alt="Preview da câmera"
        className={cn("aspect-video w-full max-h-48 rounded-lg border object-cover", className)}
      />
    );
  }

  if (typeof kind === "object" && kind.type === "embed") {
    return (
      <iframe
        title="Stream"
        src={kind.src}
        className={cn("aspect-video w-full max-h-48 rounded-lg border", className)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
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
        RTSP/RTMP requer gateway WebRTC/HLS — use URL .m3u8 ou snapshot HTTP.
      </div>
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
      Abrir stream externo
    </a>
  );
}
