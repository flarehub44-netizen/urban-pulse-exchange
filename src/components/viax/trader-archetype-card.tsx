import { motion } from "framer-motion";
import { useTraderArchetype } from "@/hooks/use-trader-archetype";

export function TraderArchetypeCard() {
  const { data, isLoading } = useTraderArchetype();

  if (isLoading || !data?.archetype) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-card/80 p-4 backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-2xl">
          {data.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-primary">Seu Arquétipo</p>
          <h3 className="mt-0.5 text-base font-bold text-foreground">{data.archetype}</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{data.description}</p>
        </div>
      </div>
      {data.total_bets > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.accuracy > 0 && (
            <Chip label={`${data.accuracy}% de acerto`} />
          )}
          {data.top_region && (
            <Chip label={`📍 ${data.top_region}`} />
          )}
          {data.total_bets > 0 && (
            <Chip label={`${data.total_bets} apostas`} />
          )}
        </div>
      )}
    </motion.div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary/80">
      {label}
    </span>
  );
}
