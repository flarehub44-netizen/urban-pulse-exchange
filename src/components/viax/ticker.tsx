import { motion } from "framer-motion";
import { useViaX } from "@/store/viax-store";
import { probability } from "@/lib/parimutuel";

export function Ticker() {
  const markets = useViaX((s) => s.markets);
  const items = markets.map((m) => {
    const p = probability(m.pool, "YES");
    return { id: m.id, label: m.region, prob: p, trend: m.trend };
  });
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-border/60 bg-card/40 py-2 backdrop-blur">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 50, ease: "linear", repeat: Infinity }}
      >
        {doubled.map((it, idx) => {
          const up = it.trend >= 0;
          return (
            <div key={idx} className="flex items-center gap-2 px-6 text-xs">
              <span className="text-muted-foreground">{it.label}</span>
              <span className="mono text-foreground">{(it.prob * 100).toFixed(1)}%</span>
              <span className={up ? "text-up" : "text-down"}>
                {up ? "▲" : "▼"} {(Math.abs(it.trend) * 5).toFixed(2)}%
              </span>
              <span className="size-1 rounded-full bg-border" />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
