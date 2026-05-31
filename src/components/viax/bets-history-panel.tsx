import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  History,
  Search,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Wallet as WalletIcon,
} from "lucide-react";
import { useBets, type OpenBet } from "@/hooks/use-bets";
import { useFootballBets, type FootballOpenBet } from "@/hooks/use-football-bets";
import { formatBRL } from "@/lib/parimutuel";
import { isTerminalStatus, statusLabel, type MarketStatus } from "@/lib/market-status";
import { EmptyState } from "@/components/viax/empty-state";
import { cn } from "@/lib/utils";

export type BetsHistoryFilter = "all" | "open" | "won" | "lost" | "refund";
export type BetsHistoryType = "all" | "traffic" | "football";

interface UnifiedBet {
  id: string;
  kind: "traffic" | "football";
  marketId: string;
  title: string;
  subtitle: string;
  status: MarketStatus;
  side: string;
  stake: number;
  payout: number | null;
  createdAt: number;
  link: { to: string; params: Record<string, string> };
}

function trafficToUnified(b: OpenBet): UnifiedBet {
  return {
    id: b.id,
    kind: "traffic",
    marketId: b.marketId,
    title: b.marketQuestion,
    subtitle: b.marketRegion,
    status: b.marketStatus,
    side: b.side === "YES" ? "SIM" : "NÃO",
    stake: b.stake,
    payout: b.payout,
    createdAt: b.createdAt,
    link: { to: "/markets/$marketId", params: { marketId: b.marketId } },
  };
}

function footballToUnified(b: FootballOpenBet): UnifiedBet {
  const side =
    b.outcome === "HOME" ? b.homeTeam : b.outcome === "AWAY" ? b.awayTeam : "Empate";
  return {
    id: b.id,
    kind: "football",
    marketId: b.marketId,
    title: `${b.homeTeam} x ${b.awayTeam}`,
    subtitle: b.marketQuestion || "Futebol",
    status: b.marketStatus,
    side,
    stake: b.stake,
    payout: b.payout,
    createdAt: b.createdAt,
    link: { to: "/football/$marketId", params: { marketId: b.marketId } },
  };
}

function outcomeOf(b: UnifiedBet): BetsHistoryFilter {
  if (!isTerminalStatus(b.status)) return "open";
  if (b.status === "void") return "refund";
  if (b.payout != null && b.payout > b.stake) return "won";
  return "lost";
}

interface Props {
  filter: BetsHistoryFilter;
  type: BetsHistoryType;
  q: string;
}

export function BetsHistoryPanel({ filter, type, q }: Props) {
  const navigate = useNavigate({ from: "/bets-history" });
  const { data: bets, isLoading } = useBets();
  const { data: fbBets, isLoading: fbLoading } = useFootballBets();
  const loading = isLoading || fbLoading;

  const all = useMemo<UnifiedBet[]>(() => {
    const a = (bets ?? []).map(trafficToUnified);
    const b = (fbBets ?? []).map(footballToUnified);
    return [...a, ...b].sort((x, y) => y.createdAt - x.createdAt);
  }, [bets, fbBets]);

  const filtered = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    return all.filter((b) => {
      if (type !== "all" && b.kind !== type) return false;
      if (filter !== "all" && outcomeOf(b) !== filter) return false;
      if (qNorm && !`${b.title} ${b.subtitle}`.toLowerCase().includes(qNorm)) return false;
      return true;
    });
  }, [all, filter, type, q]);

  const kpis = useMemo(() => {
    let totalStake = 0;
    let totalPayout = 0;
    let wins = 0;
    let losses = 0;
    for (const b of filtered) {
      totalStake += b.stake;
      if (b.payout != null) totalPayout += b.payout;
      const o = outcomeOf(b);
      if (o === "won") wins++;
      else if (o === "lost") losses++;
    }
    const net = totalPayout - totalStake;
    const resolved = wins + losses;
    const winRate = resolved > 0 ? (wins / resolved) * 100 : 0;
    return { totalStake, totalPayout, net, wins, losses, winRate, count: filtered.length };
  }, [filtered]);

  const setSearch = (patch: Partial<{ filter: BetsHistoryFilter; type: BetsHistoryType; q: string }>) =>
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }),
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-page text-2xl">
          Histórico de <span className="text-highlight">apostas</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Veja todas as suas previsões — abertas, ganhas, perdidas e reembolsadas.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={<History className="size-3" />}
          label="Apostas"
          value={<span className="mono">{kpis.count}</span>}
        />
        <Kpi
          icon={<WalletIcon className="size-3" />}
          label="Total apostado"
          value={<span className="mono">{formatBRL(kpis.totalStake)}</span>}
        />
        <Kpi
          icon={<TrendingUp className="size-3" />}
          label="Total recebido"
          value={<span className="mono text-up">{formatBRL(kpis.totalPayout)}</span>}
        />
        <Kpi
          icon={kpis.net >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          label="Resultado líquido"
          value={
            <span className={cn("mono", kpis.net >= 0 ? "text-up" : "text-down")}>
              {kpis.net >= 0 ? "+" : ""}
              {formatBRL(kpis.net)}
            </span>
          }
          sub={`${kpis.wins}V · ${kpis.losses}D · ${kpis.winRate.toFixed(0)}% acerto`}
        />
      </div>

      {/* Filtros */}
      <div className="space-y-3 rounded-2xl border bg-card/60 p-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setSearch({ q: e.target.value })}
            placeholder="Buscar por mercado, região ou time..."
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterGroup
            label="Resultado"
            value={filter}
            onChange={(v) => setSearch({ filter: v as BetsHistoryFilter })}
            options={[
              { value: "all", label: "Todas" },
              { value: "open", label: "Abertas" },
              { value: "won", label: "Ganhas" },
              { value: "lost", label: "Perdidas" },
              { value: "refund", label: "Reembolso" },
            ]}
          />
          <FilterGroup
            label="Tipo"
            value={type}
            onChange={(v) => setSearch({ type: v as BetsHistoryType })}
            options={[
              { value: "all", label: "Tudo" },
              { value: "traffic", label: "Tráfego" },
              { value: "football", label: "Futebol" },
            ]}
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border bg-card/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nada por aqui"
          description={
            q || filter !== "all" || type !== "all"
              ? "Nenhuma aposta combina com os filtros atuais."
              : "Quando você fizer sua primeira aposta, ela aparecerá aqui."
          }
          action={{ label: "Ver mercados", to: "/markets", search: { status: "live" } }}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((b) => (
            <BetRow key={`${b.kind}-${b.id}`} bet={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition",
              value === o.value
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background hover:bg-surface/60",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BetRow({ bet }: { bet: UnifiedBet }) {
  const result = outcomeOf(bet);
  const pnl = bet.payout != null ? bet.payout - bet.stake : null;
  const date = new Date(bet.createdAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li>
      <Link
        to={bet.link.to}
        params={bet.link.params}
        className="group block rounded-xl border bg-card/60 p-4 backdrop-blur transition hover:bg-surface/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{bet.kind === "football" ? "Futebol" : bet.subtitle}</span>
              <span>·</span>
              <span>{statusLabel(bet.status)}</span>
              <span>·</span>
              <span>{date}</span>
            </div>
            <div className="mt-0.5 line-clamp-2 text-sm font-medium">{bet.title}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ResultBadge result={result} />
            <ArrowUpRight className="size-4 text-muted-foreground/40 group-hover:text-primary" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Lado" value={bet.side} />
          <Stat label="Aposta" value={formatBRL(bet.stake)} />
          <Stat
            label={result === "open" ? "Status" : result === "refund" ? "Devolvido" : "Resultado"}
            value={
              bet.payout != null ? (
                <span
                  className={cn(
                    pnl != null && pnl > 0
                      ? "text-up"
                      : pnl != null && pnl < 0
                        ? "text-down"
                        : "text-muted-foreground",
                  )}
                >
                  {formatBRL(bet.payout)}
                  {pnl != null && pnl !== 0 && (
                    <span className="ml-1 text-[10px]">
                      ({pnl > 0 ? "+" : ""}
                      {formatBRL(pnl)})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
        </div>
      </Link>
    </li>
  );
}

function ResultBadge({ result }: { result: BetsHistoryFilter }) {
  const map: Record<BetsHistoryFilter, { label: string; className: string }> = {
    all: { label: "—", className: "bg-muted text-muted-foreground" },
    open: { label: "ABERTA", className: "bg-primary/15 text-primary" },
    won: { label: "GANHOU", className: "bg-up/15 text-up" },
    lost: { label: "PERDEU", className: "bg-down/15 text-down" },
    refund: { label: "REEMBOLSO", className: "bg-warn/15 text-warn" },
  };
  const it = map[result];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", it.className)}>
      {it.label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-surface/60 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mono mt-0.5 text-sm">{value}</div>
    </div>
  );
}
