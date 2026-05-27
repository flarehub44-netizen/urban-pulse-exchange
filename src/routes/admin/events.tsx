import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { InlineError } from "@/components/viax/inline-error";
import { copy } from "@/copy/pt-BR";
import { cn } from "@/lib/utils";
import { useAdminMarketOpsStatus } from "@/hooks/use-admin-dashboard";
import {
  useAdminEventsOverview,
  useAdminPlatformEvents,
  useAdminUpsertPlatformEvent,
  useAdminDeletePlatformEvent,
  useAdminDailyPolls,
  useAdminUpsertDailyPoll,
  useAdminDeleteDailyPoll,
  useAdminPartnerEventsFeed,
  useAdminDeletePartnerEvent,
  platformEventStatus,
  type AdminPlatformEvent,
  type AdminDailyPoll,
} from "@/hooks/use-admin-events";

export const Route = createFileRoute("/admin/events")({
  component: AdminEventsPage,
});

type Tab = "overview" | "seasonal" | "polls" | "affiliates";

const emptyEventForm = () => ({
  name: "",
  slug: "",
  description: "",
  startsAt: "",
  endsAt: "",
  badgeIcon: "🎉",
  xpBoost: "0",
});

function AdminEventsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const {
    data: overview,
    isError: overviewError,
    refetch: refetchOverview,
  } = useAdminEventsOverview();
  const {
    data: seasonal,
    isError: seasonalError,
    refetch: refetchSeasonal,
  } = useAdminPlatformEvents();
  const { data: polls, isError: pollsError, refetch: refetchPolls } = useAdminDailyPolls();
  const [partnerFilter, setPartnerFilter] = useState("");
  const [partnerFilterApplied, setPartnerFilterApplied] = useState<string | null>(null);
  const {
    data: partnerEvents,
    isError: partnerError,
    refetch: refetchPartner,
  } = useAdminPartnerEventsFeed(partnerFilterApplied);
  const { data: opsStatus } = useAdminMarketOpsStatus();

  const upsertEvent = useAdminUpsertPlatformEvent();
  const deleteEvent = useAdminDeletePlatformEvent();
  const upsertPoll = useAdminUpsertDailyPoll();
  const deletePoll = useAdminDeleteDailyPoll();
  const deletePartnerEvent = useAdminDeletePartnerEvent();

  const [eventForm, setEventForm] = useState(emptyEventForm());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollDate, setPollDate] = useState(new Date().toISOString().slice(0, 10));
  const [editingPollId, setEditingPollId] = useState<string | null>(null);

  if (overviewError || seasonalError || pollsError || partnerError) {
    return (
      <InlineError
        onRetry={() => {
          void refetchOverview();
          void refetchSeasonal();
          void refetchPolls();
          void refetchPartner();
        }}
      />
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: copy.admin.events.tabOverview },
    { id: "seasonal", label: copy.admin.events.tabSeasonal },
    { id: "polls", label: copy.admin.events.tabPolls },
    { id: "affiliates", label: copy.admin.events.tabAffiliates },
  ];

  const resetEventForm = () => {
    setEventForm(emptyEventForm());
    setEditingEventId(null);
  };

  const loadEventForEdit = (e: AdminPlatformEvent) => {
    setEditingEventId(e.id);
    setEventForm({
      name: e.name,
      slug: e.slug,
      description: e.description ?? "",
      startsAt: e.starts_at.slice(0, 16),
      endsAt: e.ends_at.slice(0, 16),
      badgeIcon: e.badge_icon ?? "🎉",
      xpBoost: String(e.xp_boost ?? 0),
    });
    setTab("seasonal");
  };

  const onSaveEvent = async () => {
    if (!eventForm.name.trim() || !eventForm.startsAt || !eventForm.endsAt) return;
    try {
      await upsertEvent.mutateAsync({
        id: editingEventId,
        name: eventForm.name.trim(),
        slug: eventForm.slug.trim(),
        description: eventForm.description,
        startsAt: new Date(eventForm.startsAt).toISOString(),
        endsAt: new Date(eventForm.endsAt).toISOString(),
        badgeIcon: eventForm.badgeIcon,
        xpBoost: Number(eventForm.xpBoost) || 0,
      });
      toast.success(copy.admin.events.eventSaved);
      resetEventForm();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onDeleteEvent = async (id: string) => {
    try {
      await deleteEvent.mutateAsync(id);
      toast.success(copy.admin.events.eventDeleted);
      if (editingEventId === id) resetEventForm();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onSavePoll = async () => {
    if (!pollQuestion.trim() || !pollDate) return;
    try {
      await upsertPoll.mutateAsync({
        id: editingPollId,
        question: pollQuestion.trim(),
        pollDate,
      });
      toast.success(copy.admin.events.pollSaved);
      setPollQuestion("");
      setPollDate(new Date().toISOString().slice(0, 10));
      setEditingPollId(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const loadPollForEdit = (p: AdminDailyPoll) => {
    setEditingPollId(p.id);
    setPollQuestion(p.question);
    setPollDate(p.poll_date);
    setTab("polls");
  };

  const onDeletePoll = async (id: string) => {
    try {
      await deletePoll.mutateAsync(id);
      toast.success(copy.admin.events.pollDeleted);
      if (editingPollId === id) {
        setEditingPollId(null);
        setPollQuestion("");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const onDeletePartnerEvent = async (id: number) => {
    try {
      await deletePartnerEvent.mutateAsync(id);
      toast.success(copy.admin.events.partnerEventDeleted);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const statusLabel = (status: ReturnType<typeof platformEventStatus>) => {
    if (status === "active") return copy.admin.events.statusActive;
    if (status === "upcoming") return copy.admin.events.statusUpcoming;
    return copy.admin.events.statusEnded;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.admin.events.title}</h1>
        <p className="text-xs text-muted-foreground">{copy.admin.events.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && overview && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              label={copy.admin.events.seasonalActive}
              value={overview.platform_events.active}
            />
            <AdminStatCard
              label={copy.admin.events.seasonalUpcoming}
              value={overview.platform_events.upcoming}
            />
            <AdminStatCard
              label={copy.admin.events.pollsToday}
              value={overview.daily_polls.has_today ? 1 : 0}
            />
            <AdminStatCard
              label={copy.admin.events.partnerEvents24h}
              value={overview.partner_events.last_24h}
            />
            <AdminStatCard label={copy.admin.events.marketsLive} value={overview.markets.live} />
            <AdminStatCard
              label={copy.admin.events.marketsDispute}
              value={overview.markets.dispute}
            />
            <AdminStatCard
              label={copy.admin.events.footballPending}
              value={overview.football.pending_fixtures}
            />
            <AdminStatCard
              label={copy.admin.events.communityReports}
              value={overview.community.pending_reports}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/markets"
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-surface"
            >
              {copy.admin.events.goMarkets}
            </Link>
            <Link
              to="/admin/football"
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-surface"
            >
              {copy.admin.events.goFootball}
            </Link>
            <Link
              to="/admin/partners"
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-surface"
            >
              {copy.admin.events.goPartners}
            </Link>
          </div>

          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold">{copy.admin.events.opsTitle}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border bg-background/40 p-3 text-xs space-y-1.5">
                <div className="font-medium">{copy.admin.events.opsFootballTitle}</div>
                <div className="text-muted-foreground">
                  {copy.admin.events.opsAutoRules}:{" "}
                  {opsStatus?.football.enabled ? copy.admin.events.opsEnabled : copy.admin.events.opsDisabled}
                </div>
                <div className="text-muted-foreground">
                  Entradas fecham {opsStatus?.football.closeMinutes ?? 5} min antes · Janela sync -
                  {opsStatus?.football.syncDaysBack ?? 1}/+{opsStatus?.football.syncDaysAhead ?? 1}
                </div>
                <div className="text-muted-foreground">
                  {copy.admin.events.opsPendingFixtures}: {opsStatus?.football.pendingFixtures ?? 0}
                </div>
                <div className="text-muted-foreground">
                  {copy.admin.events.opsLastRun}:{" "}
                  {opsStatus?.football.lastSyncRun?.at
                    ? format(new Date(opsStatus.football.lastSyncRun.at), "dd/MM HH:mm", { locale: ptBR })
                    : copy.admin.events.opsNoRun}
                </div>
                <Link to="/admin/football" className="text-primary hover:underline">
                  {copy.admin.events.opsOpenAdmin}
                </Link>
              </div>

              <div className="rounded-lg border bg-background/40 p-3 text-xs space-y-1.5">
                <div className="font-medium">{copy.admin.events.opsTrafficTitle}</div>
                <div className="text-muted-foreground">
                  {copy.admin.events.opsLiveMarkets}: {opsStatus?.traffic.liveMarkets ?? 0}
                </div>
                <div className="text-muted-foreground">
                  {copy.admin.events.opsDisputeMarkets}: {opsStatus?.traffic.disputeMarkets ?? 0}
                </div>
                <div className="text-muted-foreground">
                  {copy.admin.events.opsDraftMarkets}: {opsStatus?.traffic.draftMarkets ?? 0}
                </div>
                <Link to="/admin/markets" className="text-primary hover:underline">
                  {copy.admin.events.opsOpenAdmin}
                </Link>
              </div>

              <div className="rounded-lg border bg-background/40 p-3 text-xs space-y-1.5">
                <div className="font-medium">{copy.admin.events.opsCommunityTitle}</div>
                <div className="text-muted-foreground">
                  {copy.admin.events.opsPendingReports}: {opsStatus?.community.pendingReports ?? 0}
                </div>
                <Link to="/admin/community" className="text-primary hover:underline">
                  {copy.admin.events.opsOpenAdmin}
                </Link>
              </div>

              <div className="rounded-lg border bg-background/40 p-3 text-xs space-y-1.5">
                <div className="font-medium">{copy.admin.events.opsOtherTitle}</div>
                <div className="text-muted-foreground">
                  Lifecycle e rotinas de resolução seguem ativos via jobs/plataforma.
                </div>
                <Link to="/admin/system" className="text-primary hover:underline">
                  {copy.admin.events.opsOpenAdmin}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "seasonal" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h2 className="text-sm font-medium">
              {editingEventId ? copy.admin.events.editEvent : copy.admin.events.createEvent}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-muted-foreground">{copy.admin.events.name}</span>
                <input
                  value={eventForm.name}
                  onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5"
                />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">{copy.admin.events.slug}</span>
                <input
                  value={eventForm.slug}
                  onChange={(e) => setEventForm((f) => ({ ...f, slug: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5 mono"
                />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-muted-foreground">{copy.admin.events.description}</span>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5"
                />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">{copy.admin.events.startsAt}</span>
                <input
                  type="datetime-local"
                  value={eventForm.startsAt}
                  onChange={(e) => setEventForm((f) => ({ ...f, startsAt: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5"
                />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">{copy.admin.events.endsAt}</span>
                <input
                  type="datetime-local"
                  value={eventForm.endsAt}
                  onChange={(e) => setEventForm((f) => ({ ...f, endsAt: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5"
                />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">{copy.admin.events.badgeIcon}</span>
                <input
                  value={eventForm.badgeIcon}
                  onChange={(e) => setEventForm((f) => ({ ...f, badgeIcon: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5"
                />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">{copy.admin.events.xpBoost}</span>
                <input
                  type="number"
                  min={0}
                  value={eventForm.xpBoost}
                  onChange={(e) => setEventForm((f) => ({ ...f, xpBoost: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5 mono"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={upsertEvent.isPending}
                onClick={onSaveEvent}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
              >
                {copy.admin.events.save}
              </button>
              {editingEventId && (
                <button
                  type="button"
                  onClick={resetEventForm}
                  className="rounded-lg border px-3 py-1.5 text-xs"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {!seasonal?.length && (
            <p className="text-sm text-muted-foreground">{copy.admin.events.emptySeasonal}</p>
          )}
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="border-b bg-surface/60 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Evento</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Período</th>
                  <th className="px-3 py-2 text-right">XP</th>
                  <th className="px-3 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(seasonal ?? []).map((e) => {
                  const status = platformEventStatus(e.starts_at, e.ends_at);
                  return (
                    <tr key={e.id} className="border-b border-border/40">
                      <td className="px-3 py-2">
                        <span className="mr-2">{e.badge_icon}</span>
                        <span className="font-medium">{e.name}</span>
                      </td>
                      <td className="px-3 py-2">{statusLabel(status)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {format(new Date(e.starts_at), "dd/MM/yy HH:mm", { locale: ptBR })} –{" "}
                        {format(new Date(e.ends_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-3 py-2 text-right mono">+{e.xp_boost}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => loadEventForEdit(e)}
                            className="rounded border px-2 py-0.5 text-[10px]"
                          >
                            {copy.admin.events.editEvent}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEvent(e.id)}
                            className="rounded border px-2 py-0.5 text-[10px] text-destructive"
                          >
                            {copy.admin.events.deleteEvent}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "polls" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h2 className="text-sm font-medium">
              {editingPollId ? copy.admin.events.editEvent : copy.admin.events.createPoll}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs sm:col-span-2">
                <span className="text-muted-foreground">{copy.admin.events.question}</span>
                <input
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5"
                />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">{copy.admin.events.pollDate}</span>
                <input
                  type="date"
                  value={pollDate}
                  onChange={(e) => setPollDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-surface px-2 py-1.5"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={upsertPoll.isPending}
              onClick={onSavePoll}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
            >
              {copy.admin.events.save}
            </button>
          </div>

          {!polls?.length && (
            <p className="text-sm text-muted-foreground">{copy.admin.events.emptyPolls}</p>
          )}
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="border-b bg-surface/60 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">{copy.admin.events.pollDate}</th>
                  <th className="px-3 py-2 text-left">{copy.admin.events.question}</th>
                  <th className="px-3 py-2 text-right">{copy.admin.events.votesYes}</th>
                  <th className="px-3 py-2 text-right">{copy.admin.events.votesNo}</th>
                  <th className="px-3 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(polls ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-border/40">
                    <td className="px-3 py-2 mono">{p.poll_date}</td>
                    <td className="px-3 py-2">{p.question}</td>
                    <td className="px-3 py-2 text-right mono">{p.yes_count}</td>
                    <td className="px-3 py-2 text-right mono">{p.no_count}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => loadPollForEdit(p)}
                          className="rounded border px-2 py-0.5 text-[10px]"
                        >
                          {copy.admin.events.editEvent}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePoll(p.id)}
                          className="rounded border px-2 py-0.5 text-[10px] text-destructive"
                        >
                          {copy.admin.events.deleteEvent}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "affiliates" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs">
              <span className="text-muted-foreground">{copy.admin.events.filterPartner}</span>
              <input
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                placeholder="handle ou uuid"
                className="mt-1 w-48 rounded-lg border bg-surface px-2 py-1.5 mono"
              />
            </label>
            <button
              type="button"
              onClick={() => setPartnerFilterApplied(partnerFilter.trim() || null)}
              className="rounded-lg border px-3 py-1.5 text-xs"
            >
              {copy.admin.events.applyFilter}
            </button>
            {partnerFilterApplied && (
              <button
                type="button"
                onClick={() => {
                  setPartnerFilter("");
                  setPartnerFilterApplied(null);
                }}
                className="rounded-lg border px-3 py-1.5 text-xs"
              >
                {copy.admin.events.clearFilter}
              </button>
            )}
          </div>

          {!partnerEvents?.length && (
            <p className="text-sm text-muted-foreground">{copy.admin.events.emptyPartnerEvents}</p>
          )}
          <div className="space-y-2">
            {(partnerEvents ?? []).map((ev) => (
              <div key={ev.id} className="rounded-xl border bg-card/60 p-3 text-xs">
                <div className="flex justify-between gap-2">
                  <div>
                    <span className="font-medium">@{ev.partner_handle}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">{ev.kind}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(ev.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{ev.message}</p>
                <button
                  type="button"
                  onClick={() => onDeletePartnerEvent(ev.id)}
                  className="mt-2 rounded border px-2 py-0.5 text-[10px] text-destructive"
                >
                  {copy.admin.events.deleteEvent}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
