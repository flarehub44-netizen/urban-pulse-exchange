import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  useAdminApproveFootballFixture,
  useAdminDeleteFootballMarket,
  useAdminFootballDrafts,
  useAdminFootballLive,
  useAdminFootballPending,
  useAdminFootballResolve,
  useAdminFootballSync,
  useAdminPublishFootballMarket,
  useAdminRejectFootballFixture,
  useAdminVoidFootballMarket,
  useFootballLeagueSettings,
  useUpdateFootballSettings,
} from "@/hooks/use-admin-football";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/football")({
  component: AdminFootballPage,
});

type Tab = "pending" | "drafts" | "published" | "settings";

function getErrorMessage(error: unknown) {
  let raw: string | null = null;
  if (error instanceof Error && error.message) raw = error.message;
  else if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) raw = message;
  }
  if (!raw) return null;
  if (/kickoff already passed/i.test(raw)) {
    return "O kickoff já passou — atualize o banco (db:push) ou tente novamente.";
  }
  return raw;
}

type PublishFootballResult = {
  betting_window_open?: boolean;
  accept_bets?: boolean;
};

function publishSuccessMessage(data: unknown) {
  const result = data as PublishFootballResult | null;
  const windowOpen = result?.betting_window_open ?? result?.accept_bets;
  if (windowOpen === false) return copy.admin.football.publishedClosed;
  return copy.admin.football.published;
}

function AdminFootballPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const todayYmd = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(todayYmd);
  const {
    data: pending,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = useAdminFootballPending(selectedDate);
  const { data: drafts, isLoading: draftsLoading } = useAdminFootballDrafts();
  const { data: published, isLoading: publishedLoading } = useAdminFootballLive();
  const { data: settings } = useFootballLeagueSettings();
  const approve = useAdminApproveFootballFixture();
  const reject = useAdminRejectFootballFixture();
  const publish = useAdminPublishFootballMarket();
  const voidMarket = useAdminVoidFootballMarket();
  const deleteMarket = useAdminDeleteFootballMarket();
  const syncNow = useAdminFootballSync();
  const resolveNow = useAdminFootballResolve();
  const saveSettings = useUpdateFootballSettings();

  const [enabled, setEnabled] = useState(true);
  const pendingDisplayDate = format(new Date(`${selectedDate}T12:00:00Z`), "dd/MM/yyyy", {
    locale: ptBR,
  });

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
  }, [settings]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: copy.admin.football.tabPending },
    { key: "drafts", label: copy.admin.football.tabDrafts },
    { key: "published", label: copy.admin.football.tabPublished },
    { key: "settings", label: copy.admin.football.tabSettings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.football.title}</h1>
        <p className="text-xs text-muted-foreground">{copy.admin.football.subtitle}</p>
      </div>

      <div className="flex gap-1 border-b border-border/60">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-2 text-xs font-medium transition",
              tab === t.key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const d = addDays(new Date(`${selectedDate}T12:00:00Z`), -1);
                setSelectedDate(format(d, "yyyy-MM-dd"));
              }}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-muted"
            >
              {"<"}
            </button>
            <button
              type="button"
              className="rounded-xl border px-4 py-2 text-sm font-semibold tracking-wide"
            >
              {pendingDisplayDate}
            </button>
            <button
              type="button"
              onClick={() => {
                const d = addDays(new Date(`${selectedDate}T12:00:00Z`), 1);
                setSelectedDate(format(d, "yyyy-MM-dd"));
              }}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-muted"
            >
              {">"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(todayYmd)}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-muted"
            >
              Hoje
            </button>
          </div>
          {pendingLoading && <p className="text-xs text-muted-foreground">{copy.common.loading}</p>}
          {!pendingLoading && (!pending || pending.length === 0) && (
            <p className="text-xs text-muted-foreground">{copy.admin.football.emptyPending}</p>
          )}
          {pending?.map((row) => (
            <div
              key={row.api_fixture_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/40 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {row.home_team_name} x {row.away_team_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {row.league_name} ·{" "}
                  {format(new Date(row.kickoff_at), "dd/MM HH:mm", { locale: ptBR })} ·{" "}
                  {row.status_short}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={approve.isPending}
                  onClick={async () => {
                    try {
                      await approve.mutateAsync(row.api_fixture_id);
                      toast.success(copy.admin.football.approved);
                    } catch (e) {
                      toast.error(getErrorMessage(e) ?? "Não foi possível aprovar o jogo.");
                    }
                  }}
                  className="rounded-md bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground"
                >
                  {copy.admin.football.approve}
                </button>
                <button
                  type="button"
                  disabled={reject.isPending}
                  onClick={async () => {
                    try {
                      await reject.mutateAsync({ fixtureId: row.api_fixture_id });
                      toast.success(copy.admin.football.rejected);
                    } catch (e) {
                      toast.error(getErrorMessage(e) ?? "Não foi possível rejeitar o jogo.");
                    }
                  }}
                  className="rounded-md border px-3 py-1.5 text-[10px] text-muted-foreground hover:bg-muted"
                >
                  {copy.admin.football.reject}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "drafts" && (
        <div className="space-y-3">
          {draftsLoading && <p className="text-xs text-muted-foreground">{copy.common.loading}</p>}
          {!draftsLoading && (!drafts || drafts.length === 0) && (
            <p className="text-xs text-muted-foreground">{copy.admin.football.emptyDrafts}</p>
          )}
          {drafts?.map((row) => (
            <div
              key={row.market_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/40 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{row.question}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(row.kickoff_at), "dd/MM HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={publish.isPending || deleteMarket.isPending}
                onClick={async () => {
                  try {
                    const result = await publish.mutateAsync(row.market_id);
                    toast.success(publishSuccessMessage(result));
                  } catch (e) {
                    toast.error(getErrorMessage(e) ?? "Não foi possível publicar o jogo.");
                  }
                }}
                className="rounded-md border border-primary/40 px-3 py-1.5 text-[10px] text-primary hover:bg-primary/10"
              >
                {copy.admin.football.publish}
              </button>
              <button
                type="button"
                disabled={publish.isPending || deleteMarket.isPending}
                onClick={async () => {
                  if (
                    !window.confirm(
                      copy.admin.football.deleteConfirm.replace("{id}", row.market_id),
                    )
                  ) {
                    return;
                  }
                  try {
                    await deleteMarket.mutateAsync(row.market_id);
                    toast.success(copy.admin.football.deleteDone);
                  } catch (e) {
                    toast.error(getErrorMessage(e) ?? copy.admin.football.deleteFailed);
                  }
                }}
                className="rounded-md border border-down/40 px-3 py-1.5 text-[10px] text-down hover:bg-down/10"
              >
                {copy.admin.football.deleteMarket}
              </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "published" && (
        <div className="space-y-3">
          {publishedLoading && (
            <p className="text-xs text-muted-foreground">{copy.common.loading}</p>
          )}
          {!publishedLoading && (!published || published.length === 0) && (
            <p className="text-xs text-muted-foreground">{copy.admin.football.emptyPublished}</p>
          )}
          {published?.map((row) => (
            <div
              key={row.market_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/40 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {row.home_team_name} x {row.away_team_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {row.status} · {row.status_short} · pools {Number(row.pool_home).toFixed(0)}/
                  {Number(row.pool_draw).toFixed(0)}/{Number(row.pool_away).toFixed(0)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!["settled", "void"].includes(row.status) && (
                  <button
                    type="button"
                    disabled={voidMarket.isPending || deleteMarket.isPending}
                    onClick={async () => {
                      if (!window.confirm(`Anular ${row.market_id}?`)) return;
                      try {
                        await voidMarket.mutateAsync({ marketId: row.market_id });
                        toast.success(copy.admin.football.voidDone);
                      } catch (e) {
                        toast.error(getErrorMessage(e) ?? "Não foi possível anular o jogo.");
                      }
                    }}
                    className="rounded-md border border-down/40 px-3 py-1.5 text-[10px] text-down hover:bg-down/10"
                  >
                    {copy.admin.football.void}
                  </button>
                )}
                {row.status !== "settled" && (
                  <button
                    type="button"
                    disabled={voidMarket.isPending || deleteMarket.isPending}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          copy.admin.football.deleteConfirm.replace("{id}", row.market_id),
                        )
                      ) {
                        return;
                      }
                      try {
                        await deleteMarket.mutateAsync(row.market_id);
                        toast.success(copy.admin.football.deleteDone);
                      } catch (e) {
                        toast.error(getErrorMessage(e) ?? copy.admin.football.deleteFailed);
                      }
                    }}
                    className="rounded-md border border-down/40 px-3 py-1.5 text-[10px] text-down hover:bg-down/10"
                  >
                    {copy.admin.football.deleteMarket}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-md space-y-4 rounded-xl border bg-card/40 p-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>{copy.admin.football.enabledLabel}</span>
          </label>

          <button
            type="button"
            disabled={saveSettings.isPending}
            onClick={async () => {
              try {
                await saveSettings.mutateAsync({
                  enabled,
                });
                toast.success(copy.admin.football.settingsSaved);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro");
              }
            }}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground"
          >
            {copy.admin.football.saveSettings}
          </button>

          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <button
              type="button"
              disabled={syncNow.isPending}
              onClick={async () => {
                try {
                  const res = (await syncNow.mutateAsync(selectedDate)) as {
                    ok?: boolean;
                    upserted?: number;
                    errors?: string[];
                  };
                  console.info("[FootballSync]", res);
                  const errors = res.errors ?? [];
                  const has403 = errors.some((e) => e.includes("403"));
                  if (!res.ok || (errors.length > 0 && (res.upserted ?? 0) === 0)) {
                    toast.error(
                      has403 ? copy.admin.football.syncApi403 : copy.admin.football.syncFailed,
                      {
                        description: errors[0]?.slice(0, 160),
                      },
                    );
                  } else if (errors.length > 0) {
                    toast.warning(copy.admin.football.syncPartial, {
                      description: `${res.upserted ?? 0} jogos · ${errors.length} erro(s)`,
                    });
                  } else {
                    toast.success(copy.admin.football.syncDone, {
                      description: `${res.upserted ?? 0} jogos sincronizados`,
                    });
                  }
                  void refetchPending();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : copy.admin.football.syncFailed);
                }
              }}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
            >
              {copy.admin.football.syncNow}
            </button>
            <button
              type="button"
              disabled={resolveNow.isPending}
              onClick={async () => {
                try {
                  const res = await resolveNow.mutateAsync();
                  toast.success(copy.admin.football.resolveDone);
                  console.info("[FootballResolve]", res);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : copy.admin.football.resolveFailed);
                }
              }}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
            >
              {copy.admin.football.resolveNow}
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground">{copy.admin.football.cronHint}</p>
          <p className="text-[10px] text-muted-foreground">
            Sync automático está fixo em hoje e envia jogos para Pendentes.
          </p>
          <p className="text-[10px] text-muted-foreground">{copy.admin.football.regulationHint}</p>
        </div>
      )}
    </div>
  );
}
