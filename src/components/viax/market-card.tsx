import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Star,
  ArrowUp,
  ArrowDown,
  Zap,
} from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { EdgeBadge } from "@/components/viax/edge-badge";
import type { Market, Side } from "@/store/viax-store";
import {
  probability,
  poolTotal,
  formatBRL,
  formatPct,
  formatCompact,
  prizePool,
} from "@/lib/parimutuel";
import { AnimatedNumber } from "./animated-number";
import { ProbBar } from "./prob-bar";
import { Countdown } from "./countdown";
import { Sparkline } from "./sparkline";
import { OrderBox } from "./order-box";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/market-status";

export function MarketCard({ m, compact }: { m: Market; compact?: boolean }) {
  const pY = probability(m.pool, "YES");
  const pN = 1 - pY;
  const total = poolTotal(m.pool);
  const trendUp = m.trend >= 0;
  const [quickBet, setQuickBet] = useState<Side | null>(null);
  const { ids: watchlist, toggle } = useWatchlist();
  const watched = watchlist.includes(m.id);
  const minsLeft = m.endsAt > 0 ? (m.endsAt - Date.now()) / 60_000 : Infinity;
  const isUrgent = minsLeft > 0 && minsLeft < 30;

  return (
    <>
      <motion.div
        data-testid="market-card"
        data-market-id={m.id}
        layout
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className={cn(
          "group relative overflow-hidden rounded-2xl border bg-card/60 p-5 shadow-[var(--shadow-card)] backdrop-blur",
          isUrgent && "border-warn/40",
        )}
      >
        {isUrgent && (
          <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-1.5 bg-warn/10 py-1.5 text-[11px] font-medium text-warn">
            <Zap className="size-3 animate-pulse" />
            Últimos {Math.ceil(minsLeft)} min — apostas encerram em breve!
          </div>
        )}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100",
            isUrgent ? "via-warn/40" : "via-primary/40",
          )}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              {m.category}
            </span>
            <EdgeBadge m={m} />
            {(m.status === "dispute" || m.status === "draft" || m.status === "void") && (
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                  m.status === "dispute" && "border border-warn/40 bg-warn/10 text-warn",
                  m.status === "draft" &&
                    "border border-muted-foreground/30 bg-surface text-muted-foreground",
                  m.status === "void" && "border border-down/30 bg-down/10 text-down",
                )}
              >
                {statusLabel(m.status)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="size-3" /> <Countdown to={m.endsAt} />
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                toggle(m.id);
              }}
              className={cn(
                "rounded-full p-1 transition",
                watched ? "text-warn" : "text-muted-foreground/40 hover:text-muted-foreground",
              )}
              aria-label={watched ? "Remover favorito" : "Adicionar favorito"}
            >
              <Star className={cn("size-3.5", watched && "fill-warn")} />
            </button>
          </div>
        </div>

        <Link
          to="/markets/$marketId"
          params={{ marketId: m.id }}
          className="mt-3 block"
          data-testid="market-card-link"
        >
          <h3
            className={cn(
              "font-medium text-foreground leading-snug",
              compact ? "text-sm" : "text-[15px]",
            )}
          >
            {m.question}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{m.region}</p>
        </Link>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">SIM</div>
            <div className="flex items-baseline gap-1">
              <AnimatedNumber
                value={pY * 100}
                decimals={1}
                className="text-xl font-semibold text-up"
              />
              <span className="text-xs text-up/70">%</span>
            </div>
          </div>
          <div className="flex-1">
            <Sparkline
              data={m.history.map((h) => h.p)}
              stroke={trendUp ? "var(--color-up)" : "var(--color-down)"}
            />
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">NÃO</div>
            <div className="flex items-baseline justify-end gap-1">
              <AnimatedNumber
                value={pN * 100}
                decimals={1}
                className="text-xl font-semibold text-down"
              />
              <span className="text-xs text-down/70">%</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <ProbBar yes={m.pool.YES} no={m.pool.NO} />
          <div className="mt-2 flex items-center justify-between text-[11px] mono text-muted-foreground">
            <span>
              SIM <span className="text-up">{formatBRL(m.pool.YES)}</span>
            </span>
            <span>
              NÃO <span className="text-down">{formatBRL(m.pool.NO)}</span>
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="size-3" /> {formatCompact(m.participants)} {copy.marketCard.traders}
          </span>
          <span>
            {copy.marketCard.prizeTotal}{" "}
            <span className="text-foreground mono">{formatBRL(prizePool(m.pool))}</span>
          </span>
          <span className={cn("flex items-center gap-1 mono", trendUp ? "text-up" : "text-down")}>
            {trendUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {formatPct(Math.abs(m.trend) * 0.05, 2)}
          </span>
        </div>

        {!compact && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setQuickBet("YES")}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-up/30 bg-up/10 px-3 py-2 text-center text-sm font-medium text-up transition hover:bg-up/20 hover:shadow-[var(--shadow-glow-up)]"
            >
              <ArrowUp className="size-3.5" /> SIM · {(pY * 100).toFixed(0)}%
            </button>
            <button
              type="button"
              onClick={() => setQuickBet("NO")}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-down/30 bg-down/10 px-3 py-2 text-center text-sm font-medium text-down transition hover:bg-down/20 hover:shadow-[var(--shadow-glow-down)]"
            >
              <ArrowDown className="size-3.5" /> NÃO · {(pN * 100).toFixed(0)}%
            </button>
          </div>
        )}
      </motion.div>

      <Dialog
        open={quickBet !== null}
        onOpenChange={(open) => {
          if (!open) setQuickBet(null);
        }}
      >
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle className="text-sm font-medium leading-snug line-clamp-2">
              {m.question}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{m.region}</p>
          </DialogHeader>
          <div className="p-4">
            <OrderBox m={m} initialSide={quickBet ?? "YES"} onSuccess={() => setQuickBet(null)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
