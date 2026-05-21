import { motion } from "framer-motion";
import { useViaX } from "@/store/viax-store";
import { Link } from "@tanstack/react-router";

function colorFor(c: number): { fill: string; stroke: string } {
  if (c > 0.75) return { fill: "var(--color-down)", stroke: "var(--color-down)" };
  if (c > 0.5)  return { fill: "var(--color-warn)", stroke: "var(--color-warn)" };
  return { fill: "var(--color-up)", stroke: "var(--color-up)" };
}

export function CityHeatmap({ height = 420 }: { height?: number }) {
  const regions = useViaX((s) => s.regions);
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card/40 backdrop-blur" style={{ height }}>
      <div className="absolute inset-0 grid-bg opacity-40" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {/* stylized São Paulo silhouette */}
        <path
          d="M12,38 Q18,18 38,14 Q58,8 74,18 Q90,28 88,46 Q92,62 82,76 Q70,90 52,90 Q34,92 22,80 Q8,62 12,38 Z"
          fill="oklch(0.22 0.02 250 / 0.6)"
          stroke="oklch(0.40 0.04 250 / 0.7)"
          strokeWidth="0.3"
        />
        {/* major arteries */}
        <g stroke="oklch(0.5 0.05 250 / 0.6)" strokeWidth="0.25" fill="none">
          <path d="M20,40 L80,60" />
          <path d="M30,20 L60,80" />
          <path d="M14,55 Q40,50 86,52" />
          <path d="M50,12 L50,88" strokeDasharray="0.6 0.6" />
        </g>

        {/* river */}
        <path d="M10,30 Q30,22 54,30 Q78,38 92,30" stroke="oklch(0.55 0.10 240 / 0.5)" strokeWidth="0.8" fill="none" />

        {regions.map((r) => {
          const c = colorFor(r.congestion);
          const size = r.r;
          return (
            <g key={r.id}>
              <circle cx={r.x} cy={r.y} r={size * 1.8} fill={c.fill} opacity={r.congestion * 0.35}>
                <animate attributeName="r" values={`${size * 1.5};${size * 2.2};${size * 1.5}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values={`${r.congestion*0.18};${r.congestion*0.45};${r.congestion*0.18}`} dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx={r.x} cy={r.y} r={size * 0.5} fill={c.fill} stroke={c.stroke} strokeWidth="0.2" />
            </g>
          );
        })}
      </svg>

      <div className="absolute inset-0 pointer-events-none">
        {regions.map((r) => {
          const c = colorFor(r.congestion);
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
            >
              <div className="pointer-events-auto group relative">
                <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-md border bg-popover/95 px-2 py-1 text-[10px] backdrop-blur group-hover:block">
                  <div className="font-medium">{r.name}</div>
                  <div className="mono text-muted-foreground">{r.flow.toLocaleString("pt-BR")} carros/h · {r.avgSpeed.toFixed(0)} km/h</div>
                </div>
                <span className="mono text-[9px] uppercase tracking-wider" style={{ color: c.fill }}>
                  ● {r.name}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border bg-popover/70 px-3 py-1.5 text-[10px] backdrop-blur">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-up" /> Fluido</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warn" /> Moderado</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-down" /> Congestionado</span>
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border bg-popover/70 px-2 py-1 text-[10px] backdrop-blur">
        <span className="size-1.5 rounded-full bg-up animate-[pulse-glow_2s_ease-in-out_infinite]" />
        Atualização ao vivo
      </div>
      <Link
        to="/live"
        className="absolute right-3 bottom-3 rounded-full border bg-popover/70 px-3 py-1 text-[10px] backdrop-blur hover:bg-surface"
      >
        Abrir mapa →
      </Link>
    </div>
  );
}
