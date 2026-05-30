import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Trophy, Users, Plus, Link2, LogIn, LogOut, Crown } from "lucide-react";
import {
  useMyLeagues,
  useLeagueLeaderboard,
  useCreateLeague,
  useJoinLeague,
  useLeaveLeague,
} from "@/hooks/use-leagues";
import { cn } from "@/lib/utils";
import type { Division } from "@/store/viax-store";

function divisionFromDb(d: string): Division {
  const map: Record<string, Division> = {
    bronze: "Bronze",
    silver: "Prata",
    gold: "Ouro",
    platinum: "Platina",
    diamond: "Diamante",
    elite: "Elite",
    Bronze: "Bronze",
    Prata: "Prata",
    Ouro: "Ouro",
    Platina: "Platina",
    Diamante: "Diamante",
    Elite: "Elite",
  };
  return map[d] ?? "Bronze";
}

export const Route = createFileRoute("/_app/leagues")({
  head: () => ({
    meta: [
      { title: "Ligas · ViaX" },
      { name: "description", content: "Crie e entre em ligas privadas para competir com amigos." },
    ],
  }),
  component: LeaguesPage,
});

function LeaguesPage() {
  const { data: leagues = [], isLoading } = useMyLeagues();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createIsPublic, setCreateIsPublic] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const { data: leaderboard = [] } = useLeagueLeaderboard(selectedLeagueId);
  const { mutateAsync: create, isPending: creating } = useCreateLeague();
  const { mutateAsync: join, isPending: joining } = useJoinLeague();
  const { mutateAsync: leave } = useLeaveLeague();

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      const res = await create({ name: createName.trim(), is_public: createIsPublic });
      toast.success(`Liga "${res.name}" criada!`, {
        description: `Código de convite: ${res.invite_code}`,
      });
      setCreateName("");
      setCreateIsPublic(false);
      setShowCreate(false);
      setSelectedLeagueId(res.id);
    } catch {
      toast.error("Erro ao criar liga.");
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      const res = await join(joinCode.trim().toUpperCase());
      if (res.ok) {
        if (res.already_member) toast.message("Você já está nessa liga.");
        else toast.success(`Entrou na liga "${res.name}"!`);
        setJoinCode("");
        setShowJoin(false);
        if (res.league_id) setSelectedLeagueId(res.league_id);
      } else {
        toast.error("Código inválido. Verifique e tente de novo.");
      }
    } catch {
      toast.error("Erro ao entrar na liga.");
    }
  };

  const handleLeave = async (leagueId: string, leagueName: string) => {
    try {
      await leave(leagueId);
      toast.message(`Você saiu da liga "${leagueName}".`);
      if (selectedLeagueId === leagueId) setSelectedLeagueId(null);
    } catch {
      toast.error("Erro ao sair da liga.");
    }
  };

  const copyInvite = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success("Código copiado!"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-page text-2xl">
          <span className="text-highlight">Ligas</span> Privadas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie um grupo com amigos e compita no ranking da sua liga.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setShowJoin(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> Criar liga
        </button>
        <button
          type="button"
          onClick={() => {
            setShowJoin(true);
            setShowCreate(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
        >
          <LogIn className="size-4" /> Entrar com código
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card/60 p-4 backdrop-blur"
        >
          <h3 className="heading-section">
            <span className="text-highlight">Nova</span> liga
          </h3>
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
              🔒 Privada (só com código)
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
              🌐 Pública (qualquer um vê)
            </button>
          </div>
        </motion.div>
      )}

      {/* Join form */}
      {showJoin && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card/60 p-4 backdrop-blur"
        >
          <h3 className="heading-section">
            Entrar em <span className="text-highlight">liga</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Peça o código de 8 letras para quem criou a liga.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="ABCD1234"
              maxLength={8}
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

      {/* Leagues list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border bg-card/60" />
          ))}
        </div>
      ) : leagues.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/40 py-12 text-center text-sm text-muted-foreground">
          <Trophy className="mx-auto mb-3 size-8 opacity-30" />
          <p>Você ainda não está em nenhuma liga.</p>
          <p className="mt-1 text-xs">Crie uma ou entre com o código de um amigo.</p>
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
              <div className="mt-2 flex items-center gap-2">
                <span className="mono text-xs text-muted-foreground border border-dashed border-border/60 rounded px-2 py-0.5">
                  {league.invite_code}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyInvite(league.invite_code);
                  }}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10"
                >
                  <Link2 className="size-3" /> Copiar
                </button>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {selectedLeague && (
        <motion.div
          key={selectedLeague.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card/60 p-4 backdrop-blur"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-section flex items-center gap-2">
              <Trophy className="size-4 text-warn" />
              {selectedLeague.name} — <span className="text-highlight">Ranking</span>
            </h2>
            {!selectedLeague.is_creator && (
              <button
                type="button"
                onClick={() => handleLeave(selectedLeague.id, selectedLeague.name)}
                className="inline-flex items-center gap-1 rounded-lg border border-down/30 px-2 py-1 text-xs text-down hover:bg-down/10"
              >
                <LogOut className="size-3" /> Sair
              </button>
            )}
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-4">Carregando ranking…</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((member, idx) => (
                <div
                  key={member.user_id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2",
                    member.is_me
                      ? "bg-primary/10 border border-primary/20"
                      : "border border-border/50",
                  )}
                >
                  <span
                    className={cn(
                      "mono text-sm font-bold w-6 text-center shrink-0",
                      idx === 0
                        ? "text-warn"
                        : idx === 1
                          ? "text-muted-foreground"
                          : idx === 2
                            ? "text-warn/70"
                            : "text-muted-foreground/60",
                    )}
                  >
                    #{idx + 1}
                  </span>
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="size-8 rounded-full bg-surface shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {member.name}
                      {member.is_me && <span className="ml-1 text-xs text-primary">(você)</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mono">
                      {member.xp.toLocaleString("pt-BR")} XP · {(member.accuracy * 100).toFixed(0)}%
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mono">
                    {divisionFromDb(member.division)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
