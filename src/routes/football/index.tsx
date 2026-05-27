import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Clock3,
  Search,
  Star,
  ChevronLeft,
  ChevronRight,
  Radio,
  CircleCheck,
} from "lucide-react";
import { useFootballHomepage, formatYmd } from "@/hooks/use-football-homepage";
import {
  loadFavoriteTeams,
  toggleFavoriteTeam,
} from "@/lib/football-home-favorites";
import { InlineError } from "@/components/viax/inline-error";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "live" | "scheduled" | "finished" | "favorites";

const TOP_LEAGUES = new Set([39, 140, 135, 78, 61, 2, 3, 71, 72, 13, 848, 11, 10, 9, 94, 88, 253]);

export const Route = createFileRoute("/football/")({
  component: FootballHomepage,
});

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FootballHomepage() {
  const [selectedDate, setSelectedDate] = useState(formatYmd(new Date()));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [leagueFilter, setLeagueFilter] = useState<number | "all">("all");
  const [topLeaguesOnly, setTopLeaguesOnly] = useState(false);
  const [favoriteTeams, setFavoriteTeams] = useState<number[]>(() => loadFavoriteTeams());

  const { data, isLoading, error, refetch, isFetching } = useFootballHomepage(selectedDate);

  const filteredFixtures = useMemo(() => {
    const fixtures = data?.fixtures ?? [];
    const q = search.trim().toLowerCase();
    return fixtures.filter((f) => {
      if (statusFilter === "live" && f.statusType !== "live") return false;
      if (statusFilter === "scheduled" && f.statusType !== "scheduled") return false;
      if (statusFilter === "finished" && f.statusType !== "finished") return false;
      if (
        statusFilter === "favorites" &&
        !favoriteTeams.includes(f.homeTeam.id) &&
        !favoriteTeams.includes(f.awayTeam.id)
      ) {
        return false;
      }
      if (topLeaguesOnly && !TOP_LEAGUES.has(f.leagueId)) return false;
      if (leagueFilter !== "all" && f.leagueId !== leagueFilter) return false;
      if (!q) return true;
      return (
        f.homeTeam.name.toLowerCase().includes(q) ||
        f.awayTeam.name.toLowerCase().includes(q) ||
        f.leagueName.toLowerCase().includes(q)
      );
    });
  }, [data?.fixtures, favoriteTeams, leagueFilter, search, statusFilter, topLeaguesOnly]);

  const grouped = useMemo(() => {
    const map = new Map<number, { label: string; items: typeof filteredFixtures }>();
    for (const f of filteredFixtures) {
      const current = map.get(f.leagueId);
      if (current) {
        current.items.push(f);
      } else {
        map.set(f.leagueId, {
          label: `${f.leagueName}${f.leagueCountry ? ` (${f.leagueCountry})` : ""}`,
          items: [f],
        });
      }
    }
    return [...map.entries()]
      .map(([leagueId, v]) => ({ leagueId, ...v }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredFixtures]);

  const counters = {
    total: filteredFixtures.length,
    live: filteredFixtures.filter((f) => f.statusType === "live").length,
    scheduled: filteredFixtures.filter((f) => f.statusType === "scheduled").length,
    finished: filteredFixtures.filter((f) => f.statusType === "finished").length,
  };

  const goDay = (delta: number) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatYmd(d));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Futebol</h1>
          <p className="text-xs text-muted-foreground">Agenda diária com filtros rápidos</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Atualizar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/40 p-3">
        <button
          type="button"
          className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
          onClick={() => goDay(-1)}
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
          <CalendarDays className="size-4 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="button"
          className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
          onClick={() => goDay(1)}
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
          onClick={() => setSelectedDate(formatYmd(new Date()))}
        >
          Hoje
        </button>
        <span className="text-xs text-muted-foreground">
          {format(new Date(`${selectedDate}T00:00:00`), "EEEE, dd 'de' MMMM yyyy", { locale: ptBR })}
        </span>
        {isFetching && <span className="text-[11px] text-muted-foreground">Atualizando…</span>}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Star className="size-3.5" />} label="Total jogos" value={counters.total} />
        <SummaryCard icon={<Radio className="size-3.5 text-up" />} label="Ao vivo" value={counters.live} />
        <SummaryCard
          icon={<Clock3 className="size-3.5 text-sky-400" />}
          label="Agendados"
          value={counters.scheduled}
        />
        <SummaryCard
          icon={<CircleCheck className="size-3.5 text-green-400" />}
          label="Encerrados"
          value={counters.finished}
        />
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 bg-card/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border px-2 py-1.5">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar time ou liga"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setTopLeaguesOnly((v) => !v)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs",
              topLeaguesOnly ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
            )}
          >
            Top Ligas
          </button>
          <select
            value={leagueFilter}
            onChange={(e) => setLeagueFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="rounded-md border bg-transparent px-3 py-1.5 text-xs"
          >
            <option value="all">Todas as ligas</option>
            {(data?.leagues ?? []).map((l) => (
              <option key={l.leagueId} value={l.leagueId}>
                {l.name} ({l.matches})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "Todos", count: counters.total },
            { key: "live", label: "Ao vivo", count: counters.live },
            { key: "scheduled", label: "Agendados", count: counters.scheduled },
            { key: "finished", label: "Encerrados", count: counters.finished },
            { key: "favorites", label: "Favoritos", count: filteredFixtures.filter((f) => favoriteTeams.includes(f.homeTeam.id) || favoriteTeams.includes(f.awayTeam.id)).length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key as StatusFilter)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs",
                statusFilter === tab.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label} <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <InlineError
          title="Não foi possível carregar os jogos"
          description={error instanceof Error ? error.message : "Erro inesperado"}
          action={{ label: "Tentar novamente", onClick: () => void refetch() }}
        />
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border/70 bg-card/40" />
          ))}
        </div>
      )}

      {!isLoading && !error && grouped.length === 0 && (
        <p className="rounded-xl border border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">
          Nenhum jogo encontrado para os filtros selecionados.
        </p>
      )}

      <div className="space-y-4">
        {grouped.map((group) => (
          <section key={group.leagueId} className="space-y-2">
            <h2 className="text-sm font-semibold">{group.label}</h2>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((f) => {
                const homeFavorite = favoriteTeams.includes(f.homeTeam.id);
                const awayFavorite = favoriteTeams.includes(f.awayTeam.id);
                return (
                  <article key={f.id} className="rounded-xl border border-border/70 bg-card/40 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(f.kickoffAt), "HH:mm")} · {f.statusShort}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFavoriteTeams(toggleFavoriteTeam(f.homeTeam.id))}
                          className={cn(
                            "rounded-full p-1",
                            homeFavorite ? "text-yellow-400" : "text-muted-foreground",
                          )}
                          title={`Favoritar ${f.homeTeam.name}`}
                        >
                          <Star className={cn("size-4", homeFavorite && "fill-current")} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFavoriteTeams(toggleFavoriteTeam(f.awayTeam.id))}
                          className={cn(
                            "rounded-full p-1",
                            awayFavorite ? "text-yellow-400" : "text-muted-foreground",
                          )}
                          title={`Favoritar ${f.awayTeam.name}`}
                        >
                          <Star className={cn("size-4", awayFavorite && "fill-current")} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">
                        {f.homeTeam.name} x {f.awayTeam.name}
                      </p>
                      {(f.goalsHome != null || f.goalsAway != null) && (
                        <p className="text-xs text-muted-foreground">
                          Placar: {f.goalsHome ?? 0} - {f.goalsAway ?? 0}
                        </p>
                      )}
                      {f.venue && <p className="text-xs text-muted-foreground">{f.venue}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
