import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Trophy, ArrowUp } from "lucide-react";

const DIVISION_LABELS: Record<string, string> = {
  bronze: "Bronze",
  silver: "Prata",
  gold: "Ouro",
  platinum: "Platina",
  diamond: "Diamante",
  elite: "Elite",
};

const DIVISION_COLORS: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
  diamond: "#b9f2ff",
  elite: "#a855f7",
};

interface Props {
  newDivision: string | null;
  onClose: () => void;
}

export function DivisionUpModal({ newDivision, onClose }: Props) {
  const open = !!newDivision;
  const label = newDivision ? (DIVISION_LABELS[newDivision] ?? newDivision) : "";
  const color = newDivision ? (DIVISION_COLORS[newDivision] ?? "var(--color-primary)") : "";

  useEffect(() => {
    if (!open) return;
    const colors = ["#ffd700", "#fff", color];
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors });
    const t = setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 }, colors }), 400);
    return () => clearTimeout(t);
  }, [open, color]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative mx-4 max-w-sm w-full rounded-3xl border-2 bg-card p-8 text-center shadow-2xl"
            style={{ borderColor: color }}
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full"
              style={{ background: `${color}20`, border: `2px solid ${color}` }}
              initial={{ rotate: -10 }}
              animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Trophy className="size-10" style={{ color }} />
            </motion.div>

            <motion.div
              className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <ArrowUp className="size-3" />
              Você subiu de divisão!
            </motion.div>

            <motion.h2
              className="mt-2 text-4xl font-bold"
              style={{ color }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {label}
            </motion.h2>

            <motion.p
              className="mt-2 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Continue apostando para manter e avançar sua divisão.
            </motion.p>

            <motion.button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl py-3 font-semibold text-white"
              style={{ background: color }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.97 }}
            >
              Continuar apostando
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
