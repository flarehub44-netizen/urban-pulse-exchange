import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  useAdminApproveFootballFixture,
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

function AdminFootballPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const {
    data: pending,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = useAdminFootballPending();
  const { data: drafts, isLoading: draftsLoading } = useAdminFootballDrafts();
  const { data: published, isLoading: publishedLoading } = useAdminFootballLive();
  const { data: settings } = useFootballLeagueSettings();
  const approve = useAdminApproveFootballFixture();
  const reject = useAdminRejectFootballFixture();
  const publish = useAdminPublishFootballMarket();
  const voidMarket = useAdminVoidFootballMarket();
  const syncNow = useAdminFootballSync();
  const resolveNow = useAdminFootballResolve();
  const saveSettings = useUpdateFootballSettings();

  const [enabled, setEnabled] = useState(true);
  const [leagueIdsText, setLeagueIdsText] = useState("71");
  const [syncDaysBack, setSyncDaysBack] = useState("1");
  const [syncDays, setSyncDays] = useState("7");
  const [closeMinutes, setCloseMinutes] = useState("5");
  const [autoApprove, setAutoApprove] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setLeagueIdsText(settings.leagueIds.join(", "));
    setSyncDaysBack(String(settings.syncDaysBack));
    setSyncDays(String(settings.syncDaysAhead));
    setCloseMinutes(String(settings.bettingCloseMinutes));
    setAutoApprove(settings.autoApprove);
  }, [settings]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: copy.admin.football.tabPending },
    { key: "drafts", label: copy.admin.football.tabDrafts },
    { key: "published", label: copy.admin.football.tabPublished },
    { key: "settings", label: copy.admin.football.tabSettings },
  ];

  const parseLeagueIds = () =>
    leagueIdsText
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));

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
                      toast.error(e instanceof Error ? e.message : copy.settings.adminResolveError);
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
                      toast.error(e instanceof Error ? e.message : copy.settings.adminResolveError);
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
              <button
                type="button"
                disabled={publish.isPending}
                onClick={async () => {
                  try {
                    await publish.mutateAsync(row.market_id);
                    toast.success(copy.admin.football.published);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : copy.settings.adminResolveError);
                  }
                }}
                className="rounded-md border border-primary/40 px-3 py-1.5 text-[10px] text-primary hover:bg-primary/10"
              >
                {copy.admin.football.publish}
              </button>
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
              {!["settled", "void"].includes(row.status) && (
                <button
                  type="button"
                  disabled={voidMarket.isPending}
                  onClick={async () => {
                    if (!window.confirm(`Anular ${row.market_id}?`)) return;
                    try {
                      await voidMarket.mutateAsync({ marketId: row.market_id });
                      toast.success(copy.admin.football.voidDone);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : copy.settings.adminResolveError);
                    }
                  }}
                  className="rounded-md border border-down/40 px-3 py-1.5 text-[10px] text-down hover:bg-down/10"
                >
                  {copy.admin.football.void}
                </button>
              )}
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
            />
            <span>{copy.admin.football.autoApproveLabel}</span>
          </label>
          <p className="text-[10px] text-muted-foreground">{copy.admin.football.autoApproveHint}</p>

          <label className="block">
            <span className="text-xs text-muted-foreground">
              {copy.admin.football.leaguesLabel}
            </span>
            <input
              value={leagueIdsText}
              onChange={(e) => setLeagueIdsText(e.target.value)}
              placeholder="71, 2, 39"
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
            />
            <span className="text-[10px] text-muted-foreground">
              {copy.admin.football.leaguesHint}
            </span>
          </label>

          <label className="block">
            <span className="text-xs text-muted-foreground">
              {copy.admin.football.syncDaysBackLabel}
            </span>
            <input
              type="number"
              min={0}
              max={30}
              value={syncDaysBack}
              onChange={(e) => setSyncDaysBack(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs text-muted-foreground">
              {copy.admin.football.syncDaysLabel}
            </span>
            <input
              type="number"
              min={0}
              max={30}
              value={syncDays}
              onChange={(e) => setSyncDays(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs text-muted-foreground">
              {copy.admin.football.closeMinutesLabel}
            </span>
            <input
              type="number"
              min={0}
              max={120}
              value={closeMinutes}
              onChange={(e) => setCloseMinutes(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            disabled={saveSettings.isPending}
            onClick={async () => {
              try {
                await saveSettings.mutateAsync({
                  enabled,
                  leagueIds: parseLeagueIds(),
                  syncDaysBack: Number(syncDaysBack),
                  syncDaysAhead: Number(syncDays),
                  bettingCloseMinutes: Number(closeMinutes),
                  autoApprove,
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
                  const res = (await syncNow.mutateAsync()) as {
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
          <p className="text-[10px] text-muted-foreground">{copy.admin.football.regulationHint}</p>
        </div>
      )}
    </div>
  );
}
