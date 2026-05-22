import { CameraPlayer } from "@/components/viax/camera-player";

/** Admin wrapper — delegates to shared CameraPlayer. */
export function CameraStreamPreview({
  url,
  className,
  offline,
}: {
  url: string;
  className?: string;
  offline?: boolean;
}) {
  return (
    <CameraPlayer url={url} className={className} offline={offline} maxHeightClass="max-h-48" />
  );
}
