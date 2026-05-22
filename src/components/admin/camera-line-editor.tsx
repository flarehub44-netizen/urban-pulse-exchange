import { useState } from "react";

/** Editor mínimo de linha de contagem (geojson simplificado). */
export function CameraLineEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (line: { x1: number; y1: number; x2: number; y2: number } | null) => void;
}) {
  const [x1, setX1] = useState(0);
  const [y1, setY1] = useState(0.5);
  const [x2, setX2] = useState(1);
  const [y2, setY2] = useState(0.5);

  const apply = () => {
    onChange({ x1, y1, x2, y2 });
  };

  return (
    <div className="rounded-xl border bg-surface/40 p-4 text-xs">
      <p className="mb-2 text-muted-foreground">Linha de contagem (coordenadas normalizadas 0–1)</p>
      <div className="relative mb-3 h-24 rounded-lg border bg-background">
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line
            x1={x1 * 100}
            y1={y1 * 100}
            x2={x2 * 100}
            y2={y2 * 100}
            stroke="oklch(0.7 0.2 250)"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-2 mono">
        <input type="number" step="0.1" value={x1} onChange={(e) => setX1(Number(e.target.value))} className="rounded border bg-surface px-1 py-0.5" />
        <input type="number" step="0.1" value={y1} onChange={(e) => setY1(Number(e.target.value))} className="rounded border bg-surface px-1 py-0.5" />
        <input type="number" step="0.1" value={x2} onChange={(e) => setX2(Number(e.target.value))} className="rounded border bg-surface px-1 py-0.5" />
        <input type="number" step="0.1" value={y2} onChange={(e) => setY2(Number(e.target.value))} className="rounded border bg-surface px-1 py-0.5" />
      </div>
      <button type="button" onClick={apply} className="mt-2 rounded border px-2 py-1 hover:bg-surface-2">
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
