import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Trophy,
  Users,
  Plus,
  Link2,
  LogIn,
  LogOut,
  Crown,
  Trash2,
  Search,
  MessageCircle,
} from "lucide-react";
import {
  useMyLeagues,
  useLeagueLeaderboard,
  useLeagueActivity,
  usePublicLeagues,
  useCreateLeague,
  useJoinLeague,
  useJoinLeagueById,
  useLeaveLeague,
  useDeleteLeague,
  useKickLeagueMember,
  useAdvanceLeagueSeason,
} from "@/hooks/use-leagues";
import { LeagueLeaderboardPanel } from "@/components/leagues/league-leaderboard-panel";
import { LeagueSeasonCountdown } from "@/components/leagues/league-season-countdown";
import { LeagueHallOfFame } from "@/components/leagues/league-hall-of-fame";
import { LeagueWeeklyMission } from "@/components/leagues/league-weekly-mission";
import { LeaguePublicPreview } from "@/components/leagues/league-public-preview";
import { LeagueRivalryPanel } from "@/components/leagues/league-rivalry-panel";
import { formatLeagueInviteUrl } from "@/lib/league-score";
import { buildLeagueInviteMessage, buildWhatsAppShareUrl } from "@/lib/league-engagement";
import {
  LEAGUE_VERTICAL_OPTIONS,
  formatLeagueVerticals,
  type LeagueVerticalId,
} from "@/lib/league-verticals";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

type LeaguesSearch = { selected?: string };

export const Route = createFileRoute("/_app/leagues")({
  validateSearch: (search: Record<string, unknown>): LeaguesSearch => ({
    selected: typeof search.selected === "string" ? search.selected : undefined,
  }),
  head: () => ({
    meta: [
      { title: `${copy.nav.leagues} · ViaX` },
      { name: "description", content: copy.leagues.subtitle },
    ],
  }),
  component: LeaguesPage,
});

function LeaguesPage() {
  const { selected } = Route.useSearch();
  const { data: leagues = [], isLoading } = useMyLeagues();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(selected ?? null);
  const [createName, setCreateName] = useState("");
  const [createIsPublic, setCreateIsPublic] = useState(false);
  const [createVerticals, setCreateVerticals] = useState<LeagueVerticalId[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [publicQ, setPublicQ] = useState("");
  const [publicVertical, setPublicVertical] = useState<string>("");
  const [rivalUserId, setRivalUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    if (selected) setSelectedLeagueId(selected);
  }, [selected]);

  useEffect(() => {
    setRivalUserId(null);
  }, [selectedLeagueId]);

  const { data: leaderboard = [], isLoading: lbLoading } = useLeagueLeaderboard(selectedLeagueId);
  const { data: activity = [] } = useLeagueActivity(showActivity ? selectedLeagueId : null);
  const { data: publicLeagues = [] } = usePublicLeagues(publicQ, publicVertical || undefined);
  const { mutateAsync: create, isPending: creating } = useCreateLeague();
  const { mutateAsync: join, isPending: joining } = useJoinLeague();
  const { mutateAsync: joinById, isPending: joiningPublic } = useJoinLeagueById();
  const { mutateAsync: leave } = useLeaveLeague();
  const { mutateAsync: deleteLeague, isPending: deleting } = useDeleteLeague();
  const { mutateAsync: kick } = useKickLeagueMember();
  const { mutateAsync: advanceSeason, isPending: advancing } = useAdvanceLeagueSeason();

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      const res = await create({
        name: createName.trim(),
        is_public: createIsPublic,
        allowed_verticals: createVerticals.length > 0 ? createVerticals : undefined,
      });
      toast.success(copy.leagues.joinSuccess(res.name), {
        description: `${copy.leagues.inviteCode}: ${res.invite_code}`,
      });
      setCreateName("");
      setCreateIsPublic(false);
      setCreateVerticals([]);
      setShowCreate(false);
      setSelectedLeagueId(res.id);
    } catch (e) {
      const msg =
        e instanceof Error && e.message.includes("league_limit")
          ? "Limite de 5 ligas."
          : copy.leagues.createError;
      toast.error(msg);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      const res = await join(joinCode.trim().toUpperCase());
      if (res.ok) {
        if (res.already_member) toast.message(copy.leagues.alreadyMember);
        else if (res.name) toast.success(copy.leagues.joinSuccess(res.name));
        setJoinCode("");
        setShowJoin(false);
        if (res.league_id) setSelectedLeagueId(res.league_id);
      } else if (res.reason === "league_full") toast.error(copy.leagues.leagueFull);
      else toast.error(copy.leagues.invalidCode);
    } catch {
      toast.error(copy.leagues.joinError);
    }
  };

  const handleJoinPublic = async (leagueId: string) => {
    try {
      const res = await joinById(leagueId);
      if (res.ok) {
        if (res.already_member) toast.message(copy.leagues.alreadyMember);
        else if (res.name) toast.success(copy.leagues.joinSuccess(res.name));
        if (res.league_id) setSelectedLeagueId(res.league_id);
      } else toast.error(copy.leagues.joinError);
    } catch {
      toast.error(copy.leagues.joinError);
    }
  };

  const handleLeave = async (leagueId: string, leagueName: string) => {
    try {
      await leave(leagueId);
      toast.message(`Você saiu da liga "${leagueName}".`);
      if (selectedLeagueId === leagueId) setSelectedLeagueId(null);
    } catch (e) {
      const msg =
        e instanceof Error && e.message.includes("must_transfer")
          ? copy.leagues.creatorLeaveError
          : copy.leagues.leaveError;
      toast.error(msg);
    }
  };

  const handleDelete = async (leagueId: string, leagueName: string) => {
    if (!window.confirm(`Excluir a liga "${leagueName}"? Essa ação não pode ser desfeita.`)) return;
    try {
      const res = await deleteLeague(leagueId);
      if (res.ok) {
        toast.success(`Liga "${leagueName}" excluída.`);
        if (selectedLeagueId === leagueId) setSelectedLeagueId(null);
      } else toast.error("Não foi possível excluir a liga.");
    } catch {
      toast.error("Erro ao excluir liga.");
    }
  };

  const copyInviteLink = (code: string) => {
    const url =
      typeof window !== "undefined"
        ? formatLeagueInviteUrl(code, window.location.origin)
        : formatLeagueInviteUrl(code);
    navigator.clipboard.writeText(url).then(() => toast.success(copy.leagues.linkCopied));
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success(copy.leagues.codeCopied));
  };

  const shareWhatsApp = (leagueName: string, code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : undefined;
    const message = buildLeagueInviteMessage(leagueName, code, origin);
    const url = buildWhatsAppShareUrl(message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-page text-2xl">
          {copy.leagues.title.split(" ")[0]}{" "}
          <span className="text-highlight">{copy.nav.leagues}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.leagues.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setShowJoin(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> {copy.leagues.create}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowJoin(true);
            setShowCreate(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
        >
          <LogIn className="size-4" /> {copy.leagues.join}
        </button>
      </div>

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card/60 p-4 backdrop-blur"
        >
          <h3 className="heading-section">{copy.leagues.newLeague}</h3>
          <div className="mt-3 flex gap-2">
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nome da liga (ex: Equipe Paulista)"
              className="flex-1 rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <button
              type="button"
              disabled={creating || !createName.trim()}
              onClick={handleCreate}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {creating ? "Criando…" : "Criar"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCreateIsPublic(false)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition",
                !createIsPublic
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-surface",
              )}
            >
              🔒 {copy.leagues.private}
            </button>
            <button
              type="button"
              onClick={() => setCreateIsPublic(true)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition",
                createIsPublic
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-surface",
              )}
            >
              🌐 {copy.leagues.public}
            </button>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{copy.leagues.verticalsLabel}</p>
            <p className="text-[10px] text-muted-foreground">{copy.leagues.verticalsHint}</p>
            <div className="flex flex-wrap gap-2">
              {LEAGUE_VERTICAL_OPTIONS.map((opt) => {
                const active = createVerticals.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setCreateVerticals((prev) =>
                        active ? prev.filter((v) => v !== opt.id) : [...prev, opt.id],
                      )
                    }
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs transition",
                      active
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:bg-surface",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {formatLeagueVerticals(createVerticals)}
            </p>
          </div>
        </motion.div>
      )}

      {showJoin && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card/60 p-4 backdrop-blur"
        >
          <h3 className="heading-section">{copy.leagues.joinLeague}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{copy.leagues.joinHint}</p>
          <div className="mt-3 flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="ABCD1234"
              maxLength={8}
              data-testid="invite-code-input"
              className="flex-1 rounded-lg border bg-surface px-3 py-2 text-sm mono uppercase outline-none focus:border-primary/50"
            />
            <button
              type="button"
              disabled={joining || joinCode.length < 6}
              onClick={handleJoin}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {joining ? "Entrando…" : "Entrar"}
            </button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border bg-card/60" />
          ))}
        </div>
      ) : leagues.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/40 py-12 text-center text-sm text-muted-foreground">
          <Trophy className="mx-auto mb-3 size-8 opacity-30" />
          <p>{copy.leagues.noLeagues}</p>
          <p className="mt-1 text-xs">{copy.leagues.createFirst}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <button
              key={league.id}
              type="button"
              onClick={() => setSelectedLeagueId(league.id === selectedLeagueId ? null : league.id)}
              className={cn(
                "rounded-2xl border bg-card/60 p-4 text-left backdrop-blur transition hover:border-primary/30",
                selectedLeagueId === league.id && "border-primary/50 bg-primary/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="size-4 text-warn shrink-0" />
                  <span className="font-semibold text-sm">{league.name}</span>
                  {league.is_creator && <Crown className="size-3 text-warn shrink-0" />}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Users className="size-3" />
                  {league.member_count}
                </div>
              </div>
              {league.season_label ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {copy.leagues.season(league.season_label)}
                </p>
              ) : null}
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {formatLeagueVerticals(league.allowed_verticals)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="mono text-xs text-muted-foreground border border-dashed border-border/60 rounded px-2 py-0.5">
                  {league.invite_code}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyInviteLink(league.invite_code);
                  }}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10"
                >
                  <Link2 className="size-3" /> {copy.leagues.copyLink}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyInviteCode(league.invite_code);
                  }}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-surface"
                >
                  {copy.leagues.copyCode}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    shareWhatsApp(league.name, league.invite_code);
                  }}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-up hover:bg-up/10"
                >
                  <MessageCircle className="size-3" /> {copy.leagues.shareWhatsApp}
                </button>
              </div>
              {league.season_ends_at ? (
                <LeagueSeasonCountdown endsAt={league.season_ends_at} className="mt-2" />
              ) : null}
            </button>
          ))}
        </div>
      )}

      <section className="rounded-2xl border bg-card/40 p-4 space-y-3">
        <h2 className="heading-section text-sm">{copy.leagues.publicSection}</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={publicQ}
              onChange={(e) => setPublicQ(e.target.value)}
              placeholder={copy.leagues.publicSearch}
              className="w-full rounded-lg border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
            />
          </div>
          <select
            value={publicVertical}
            onChange={(e) => setPublicVertical(e.target.value)}
            className="rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/50"
          >
            <option value="">{copy.leagues.filterVertical}</option>
            {LEAGUE_VERTICAL_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          {publicLeagues.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma liga pública encontrada.</p>
          ) : (
            publicLeagues.map((pl) => (
              <div
                key={pl.id}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{pl.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {copy.leagues.memberCount(pl.member_count)}
                    {pl.season_label ? ` · ${pl.season_label}` : ""}
                    {" · "}
                    {formatLeagueVerticals(pl.allowed_verticals)}
                  </div>
                  <div className="mt-1.5">
                    <p className="text-[10px] text-muted-foreground mb-0.5">
                      {copy.leagues.publicPreview}
                    </p>
                    <LeaguePublicPreview preview={pl.top_preview ?? []} />
                  </div>
                </div>
                {pl.is_member ? (
                  <span className="text-xs text-primary">Membro</span>
                ) : (
                  <button
                    type="button"
                    disabled={joiningPublic}
                    onClick={() => handleJoinPublic(pl.id)}
                    className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
                  >
                    {copy.leagues.enterPublic}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {selectedLeague && (
        <motion.div
          key={selectedLeague.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card/60 p-4 backdrop-blur space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="heading-section flex items-center gap-2">
                <Trophy className="size-4 text-warn" />
                {selectedLeague.name} —{" "}
                <span className="text-highlight">{copy.leagues.ranking}</span>
              </h2>
              {selectedLeague.season_label ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {copy.leagues.season(selectedLeague.season_label)}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {formatLeagueVerticals(selectedLeague.allowed_verticals)}
              </p>
              <LeagueSeasonCountdown endsAt={selectedLeague.season_ends_at} className="mt-1" />
              <button
                type="button"
                onClick={() => shareWhatsApp(selectedLeague.name, selectedLeague.invite_code)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-up hover:underline"
              >
                <MessageCircle className="size-3.5" /> {copy.leagues.shareWhatsApp}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedLeague.is_creator ? (
                <>
                  <button
                    type="button"
                    disabled={advancing}
                    onClick={() => advanceSeason(selectedLeague.id)}
                    className="rounded-lg border border-primary/30 px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    {advancing ? "…" : copy.leagues.advanceSeason}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete(selectedLeague.id, selectedLeague.name)}
                    className="inline-flex items-center gap-1 rounded-lg border border-down/30 px-2 py-1 text-xs text-down hover:bg-down/10 disabled:opacity-50"
                  >
                    <Trash2 className="size-3" /> {copy.leagues.deleteLeague}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLeave(selectedLeague.id, selectedLeague.name)}
                  className="inline-flex items-center gap-1 rounded-lg border border-down/30 px-2 py-1 text-xs text-down hover:bg-down/10"
                >
                  <LogOut className="size-3" /> {copy.leagues.leaveLeague}
                </button>
              )}
            </div>
          </div>

          <LeagueWeeklyMission leagueId={selectedLeague.id} />

          <LeagueRivalryPanel
            leagueId={selectedLeague.id}
            opponentUserId={rivalUserId}
            onClose={() => setRivalUserId(null)}
          />

          <p className="text-[10px] text-muted-foreground">{copy.leagues.compareHint}</p>

          <LeagueLeaderboardPanel
            members={leaderboard}
            isLoading={lbLoading}
            showKick={selectedLeague.is_creator}
            compareUserId={rivalUserId}
            onCompare={(userId) =>
              setRivalUserId((prev) => (prev === userId ? null : userId))
            }
            onKick={async (userId) => {
              await kick({ league_id: selectedLeague.id, user_id: userId });
              toast.success("Membro removido.");
            }}
          />

          <button
            type="button"
            onClick={() => setShowActivity((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {showActivity ? "Ocultar atividade" : copy.leagues.activity}
          </button>
          {showActivity && activity.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground border-t pt-3">
              {activity.map((ev, i) => (
                <li key={`${ev.at}-${i}`}>
                  {ev.kind === "join"
                    ? copy.leagues.joinActivity(ev.user_name)
                    : copy.leagues.betActivity(ev.user_name, ev.stake ?? 0)}
                </li>
              ))}
            </ul>
          ) : null}

          <LeagueHallOfFame leagueId={selectedLeague.id} />
        </motion.div>
      )}
    </div>
  );
}
