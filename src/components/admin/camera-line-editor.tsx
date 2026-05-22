import { useCallback, useRef, useState } from "react";
import { CameraPlayer } from "@/components/viax/camera-player";
import { cn } from "@/lib/utils";

export type CountLine = { x1: number; y1: number; x2: number; y2: number };

/** Linha de contagem sobre preview do stream (coordenadas 0–1). */
export function CameraLineEditor({
  value,
  onChange,
  previewUrl,
}: {
  value: unknown;
  onChange: (line: CountLine | null) => void;
  previewUrl?: string | null;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"a" | "b" | null>(null);
  const parsed = parseLine(value);
  const [line, setLine] = useState<CountLine>(parsed ?? { x1: 0.1, y1: 0.5, x2: 0.9, y2: 0.5 });

  const pointerToNorm = useCallback((clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    };
  }, []);

  const onPointerDown = (end: "a" | "b") => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(end);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const p = pointerToNorm(e.clientX, e.clientY);
    setLine((prev) =>
      dragging === "a" ? { ...prev, x1: p.x, y1: p.y } : { ...prev, x2: p.x, y2: p.y },
    );
  };

  const onPointerUp = () => {
    if (dragging) {
      setDragging(null);
      onChange(line);
    }
  };

  const apply = () => onChange(line);

  return (
    <div className="rounded-xl border bg-surface/40 p-4 text-xs">
      <p className="mb-2 text-muted-foreground">
        Linha de contagem — arraste os pontos no preview (0–1)
      </p>

      {previewUrl ? (
        <div
          ref={boxRef}
          className="relative mb-3 overflow-hidden rounded-lg border"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <CameraPlayer url={previewUrl} maxHeightClass="max-h-56" autoPlay={false} />
          <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none">
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="oklch(0.72 0.2 250)"
              strokeWidth="0.008"
            />
          </svg>
          <button
            type="button"
            className={cn(
              "absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow",
              dragging === "a" && "scale-125",
            )}
            style={{ left: `${line.x1 * 100}%`, top: `${line.y1 * 100}%` }}
            onPointerDown={onPointerDown("a")}
            aria-label="Ponto inicial da linha"
          />
          <button
            type="button"
            className={cn(
              "absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow",
              dragging === "b" && "scale-125",
            )}
            style={{ left: `${line.x2 * 100}%`, top: `${line.y2 * 100}%` }}
            onPointerDown={onPointerDown("b")}
            aria-label="Ponto final da linha"
          />
        </div>
      ) : (
        <div className="relative mb-3 h-24 rounded-lg border bg-background">
          <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line
              x1={line.x1 * 100}
              y1={line.y1 * 100}
              x2={line.x2 * 100}
              y2={line.y2 * 100}
              stroke="oklch(0.7 0.2 250)"
              strokeWidth="2"
            />
          </svg>
          <p className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
            Informe URL do stream para preview
          </p>
        </div>
      )}

      <button type="button" onClick={apply} className="rounded border px-2 py-1 hover:bg-surface-2">
        Aplicar linha
      </button>
      {value != null && (
        <pre className="mt-2 max-h-16 overflow-auto text-[10px] text-muted-foreground">
          {JSON.stringify(value)}
        </pre>
      )}
    </div>
  );
}

function parseLine(value: unknown): CountLine | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.x1 === "number" &&
    typeof v.y1 === "number" &&
    typeof v.x2 === "number" &&
    typeof v.y2 === "number"
  ) {
    return { x1: v.x1, y1: v.y1, x2: v.x2, y2: v.y2 };
  }
  return null;
}
