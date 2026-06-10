import type { League, LeagueRankSummary } from "@/actions/leagues";
import { formatLeagueInviteUrl } from "@/lib/league-score";

export type LeagueUrgency = "none" | "soon" | "urgent";

export function seasonEndsMs(endsAt?: string): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function leagueUrgency(endsAt?: string, now = Date.now()): LeagueUrgency {
  const end = seasonEndsMs(endsAt);
  if (end == null || end <= now) return "none";
  const hoursLeft = (end - now) / 3_600_000;
  if (hoursLeft <= 24) return "urgent";
  if (hoursLeft <= 72) return "soon";
  return "none";
}

export function formatDeltaRank(delta: number): string | null {
  if (!delta) return null;
  return delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`;
}

export function buildLeagueInviteMessage(
  leagueName: string,
  inviteCode: string,
  origin = "https://viax.life",
): string {
  const url = formatLeagueInviteUrl(inviteCode, origin);
  return `Entra na minha liga "${leagueName}" no ViaX! Competição semanal de previsões — ranking ao vivo. ${url}`;
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export type LeagueActionNowItem = {
  type: "league";
  priority: number;
  league: League;
  rank: LeagueRankSummary;
  urgency: LeagueUrgency;
  message: string;
};

export function buildLeagueActionNowItems(
  leagues: League[],
  ranksByLeagueId: Record<string, LeagueRankSummary | undefined>,
  now = Date.now(),
): LeagueActionNowItem[] {
  const items: LeagueActionNowItem[] = [];

  for (const league of leagues) {
    const rank = ranksByLeagueId[league.id];
    if (!rank?.ok || rank.rank == null) continue;

    const urgency = leagueUrgency(league.season_ends_at, now);
    const end = seasonEndsMs(league.season_ends_at);
    const hoursLeft = end != null && end > now ? (end - now) / 3_600_000 : null;

    let priority = 0;
    let message = "";

    if (urgency === "urgent" && hoursLeft != null) {
      priority = 920;
      if (rank.rank <= 3) {
        message = `Defenda o pódio (#${rank.rank}) — temporada acaba em ${Math.ceil(hoursLeft)}h`;
      } else {
        message = `Últimas horas da temporada — você está #${rank.rank}`;
      }
    } else if (urgency === "soon" && hoursLeft != null) {
      priority = 650;
      if (rank.rank > 3) {
        message = `Suba no ranking — #${rank.rank} de ${rank.member_count ?? "?"}`;
      } else {
        message = `Mantenha o top 3 — #${rank.rank} na liga`;
      }
    } else if (rank.rank > 3) {
      priority = 280;
      message = `Você está #${rank.rank} — uma previsão pode subir no ranking`;
    } else if (rank.rank <= 3) {
      priority = 200;
      message = `No pódio (#${rank.rank}) — continue prevendo na liga`;
    } else {
      continue;
    }

    items.push({ type: "league", priority, league, rank, urgency, message });
  }

  return items.sort((a, b) => b.priority - a.priority);
}
