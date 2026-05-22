export type StreamKind = "hls" | "image" | "embed" | "unsupported" | "link";

export function youtubeEmbed(url: string): string | null {
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

/** Mirrors DB `is_allowed_stream_url` for client-side hints. */
export function isAllowedStreamUrl(url: string | null | undefined): boolean {
  if (url == null || url.trim() === "") return true;
  const v = url.trim().toLowerCase();
  if (v.startsWith("rtsp://") || v.startsWith("rtmp://")) return false;
  if (!v.startsWith("http://") && !v.startsWith("https://")) return false;
  if (v.includes(".m3u8") || v.includes("mpegurl")) return true;
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(v) || /snapshot|frame|shot/i.test(v)) return true;
  if (v.includes("youtube.com") || v.includes("youtu.be")) return true;
  return false;
}

/** Mixed content: HTTPS app cannot play HTTP streams in production. */
export function isInsecureStreamInProd(url: string, isProd = import.meta.env.PROD): boolean {
  if (!isProd) return false;
  return url.trim().toLowerCase().startsWith("http://");
}

export function classifyStreamUrl(url: string): StreamKind | { type: "embed"; src: string } {
  const lower = url.toLowerCase();
  if (lower.startsWith("rtsp://") || lower.startsWith("rtmp://")) return "unsupported";
  if (!isAllowedStreamUrl(url)) return "unsupported";
  if (lower.includes(".m3u8") || lower.includes("mpegurl")) return "hls";
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower) || /snapshot|frame|shot/i.test(lower))
    return "image";
  const yt = youtubeEmbed(url);
  if (yt) return { type: "embed", src: yt };
  if (lower.startsWith("http://") || lower.startsWith("https://")) return "link";
  return "unsupported";
}
