import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Flame, MapPin, Star, Trophy } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { markWeeklyReportSeen, markMidweekReportSeen } from "@/hooks/use-weekly-report";
import type { WeeklyReport } from "@/actions/retention";

interface WeeklyReportModalProps {
  report: WeeklyReport;
  onClose: () => void;
  compact?: boolean;
}

const slides = ["summary", "region", "streak", "ranking"] as const;

type Slide = (typeof slides)[number];

export function WeeklyReportModal({ report, onClose, compact = false }: WeeklyReportModalProps) {
  const [idx, setIdx] = useState(0);

  const activeSlides = compact ? (["summary"] as Slide[]) : [...slides];
  const current = activeSlides[idx] as Slide;
  const isLast = idx === activeSlides.length - 1;

  const handleClose = () => {
    if (compact) markMidweekReportSeen();
    else markWeeklyReportSeen();
    onClose();
  };

  const next = () => {
    if (isLast) {
      handleClose();
    } else {
      setIdx((i) => i + 1);
    }
  };

  const accuracyPct = report.accuracy;
  const isPositivePnl = report.pnl_week >= 0;
  const winRate =
    report.bets_week > 0 ? Math.round((report.wins_week / report.bets_week) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/15 to-card shadow-2xl"
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="px-6 pt-6 pb-2">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {compact ? "Relatório de meio de semana" : "Sua Semana em SP"}
          </p>
          <p className="text-xs text-muted-foreground">{report.report_week}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -32, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="min-h-[200px] px-6 py-4"
          >
            {current === "summary" && (
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-5xl font-bold text-foreground">{winRate}%</span>
                  <p className="mt-1 text-sm text-muted-foreground">de acerto esta semana</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<Trophy className="size-4 text-warn" />}
                    label="Vitórias"
                    value={`${report.wins_week}/${report.bets_week}`}
                  />
                  <StatCard
                    icon={
                      isPositivePnl ? (
                        <TrendingUp className="size-4 text-up" />
                      ) : (
                        <TrendingDown className="size-4 text-down" />
                      )
                    }
                    label="P&L"
                    value={formatBRL(Math.abs(report.pnl_week))}
                    color={isPositivePnl ? "text-up" : "text-down"}
                    prefix={isPositivePnl ? "+" : "-"}
                  />
                </div>
              </div>
            )}

            {current === "region" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <MapPin className="size-10 text-primary" />
                {report.best_region ? (
                  <>
                    <div>
                      <p className="text-2xl font-bold">{report.best_region}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        foi sua melhor região esta semana
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {copy.retention.weeklyReportKeepPredicting}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {copy.retention.weeklyReportExplore}
                  </p>
                )}
              </div>
            )}

            {current === "streak" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <Flame className="size-10 text-warn" />
                <div>
                  <p className="text-5xl font-bold text-warn">{report.streak}</p>
                  <p className="text-sm text-muted-foreground mt-1">dias de streak</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.streak >= 7
                    ? "Impressionante! Você está construindo um hábito real."
                    : "Continue aparecendo. O streak multiplica seu XP."}
                </p>
                {report.xp_week > 0 && (
                  <div className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                    +{report.xp_week} XP esta semana
                  </div>
                )}
              </div>
            )}

            {current === "ranking" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <Star className="size-10 text-warn" />
                <div>
                  <p className="text-3xl font-bold">Top {100 - report.rank_pct}%</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você superou {report.rank_pct}% dos traders esta semana
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Divisão atual:{" "}
                  <span className="font-semibold text-foreground">{report.division}</span> ·
                  Precisão: {accuracyPct}%
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* dots */}
        <div className="flex justify-center gap-1.5 pb-2">
          {activeSlides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-4 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="p-4">
          <button
            onClick={next}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition"
          >
            {isLast ? "Ver mercados da semana →" : "Próximo →"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color = "text-foreground",
  prefix = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
  prefix?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-surface/60 p-3">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${color}`}>
        {prefix}
        {value}
      </p>
    </div>
  );
}
