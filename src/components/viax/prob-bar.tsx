import { motion } from "framer-motion";

export function ProbBar({ yes, no }: { yes: number; no: number }) {
  const total = yes + no;
  const py = total === 0 ? 0.5 : yes / total;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <motion.div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-up to-up/70"
        animate={{ width: `${py * 100}%` }}
        transition={{ type: "tween", duration: 0.6, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-y-0 right-0 bg-gradient-to-l from-down to-down/70"
        animate={{ width: `${(1 - py) * 100}%` }}
        transition={{ type: "tween", duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}
