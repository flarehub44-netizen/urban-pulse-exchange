import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Users, Clock } from "lucide-react";
import type { Market } from "@/store/viax-store";
import { probability, poolTotal, formatBRL, formatPct, formatCompact, prizePool } from "@/lib/parimutuel";
import { AnimatedNumber } from "./animated-number";
import { ProbBar } from "./prob-bar";
import { Countdown } from "./countdown";
import { Sparkline } from "./sparkline";
import { cn } from "@/lib/utils";

export function MarketCard({ m, compact }: { m: Market; compact?: boolean }) {
  const pY = probability(m.pool, "YES");
  const pN = 1 - pY;
  const total = poolTotal(m.pool);
  const trendUp = m.trend >= 0;

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative overflow-hidden rounded-2xl border bg-card/60 p-5 shadow-[var(--shadow-card)] backdrop-blur"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
          {m.category}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="size-3" /> <Countdown to={m.endsAt} />
        </span>
      </div>

      <Link to="/markets/$marketId" params={{ marketId: m.id }} className="mt-3 block">
        <h3 className={cn("font-medium text-foreground leading-snug", compact ? "text-sm" : "text-[15px]")}>
          {m.question}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{m.region}</p>
      </Link>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">SIM</div>
          <div className="flex items-baseline gap-1">
            <AnimatedNumber value={pY * 100} decimals={1} className="text-xl font-semibold text-up" />
            <span className="text-xs text-up/70">%</span>
          </div>
        </div>
        <div className="flex-1">
          <Sparkline data={m.history.map((h) => h.p)} stroke={trendUp ? "var(--color-up)" : "var(--color-down)"} />
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">NÃO</div>
          <div className="flex items-baseline justify-end gap-1">
            <AnimatedNumber value={pN * 100} decimals={1} className="text-xl font-semibold text-down" />
            <span className="text-xs text-down/70">%</span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <ProbBar yes={m.pool.YES} no={m.pool.NO} />
        <div className="mt-2 flex items-center justify-between text-[11px] mono text-muted-foreground">
          <span>SIM <span className="text-up">{formatBRL(m.pool.YES)}</span></span>
          <span>NÃO <span className="text-down">{formatBRL(m.pool.NO)}</span></span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="size-3" /> {formatCompact(m.participants)} traders</span>
        <span>Prize Pool <span className="text-foreground mono">{formatBRL(prizePool(m.pool))}</span></span>
        <span className={cn("flex items-center gap-1 mono", trendUp ? "text-up" : "text-down")}>
          {trendUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {formatPct(Math.abs(m.trend) * 0.05, 2)}
        </span>
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to="/markets/$marketId" params={{ marketId: m.id }}
            className="rounded-lg border border-up/30 bg-up/10 px-3 py-2 text-center text-sm font-medium text-up transition hover:bg-up/20 hover:shadow-[var(--shadow-glow-up)]">
            SIM · {(pY * 100).toFixed(0)}%
          </Link>
          <Link to="/markets/$marketId" params={{ marketId: m.id }}
            className="rounded-lg border border-down/30 bg-down/10 px-3 py-2 text-center text-sm font-medium text-down transition hover:bg-down/20 hover:shadow-[var(--shadow-glow-down)]">
            NÃO · {(pN * 100).toFixed(0)}%
          </Link>
        </div>
      )}
    </motion.div>
  );
}
