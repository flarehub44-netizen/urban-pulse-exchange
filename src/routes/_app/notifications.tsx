import { copy } from "@/copy/pt-BR";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useResolvedNotifications } from "@/hooks/use-resolved-data";
import { getNotificationLink } from "@/lib/notification-routes";
import { markNotificationsReadFn } from "@/actions/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCheck } from "lucide-react";
import { EmptyState } from "@/components/viax/empty-state";
import { useState } from "react";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações · ViaX" },
      { name: "description", content: copy.notifications.metaDescription },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notifications } = useResolvedNotifications();
  const [markingAll, setMarkingAll] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await markNotificationsReadFn({ data: undefined });
      await invalidate();
    } catch (e) {
      console.error("mark-read failed", e);
    } finally {
      setMarkingAll(false);
    }
  };

  const go = async (n: (typeof notifications)[0]) => {
    if (!n.read) {
      markNotificationsReadFn({ data: undefined })
        .then(invalidate)
        .catch((e) => console.error("mark-read failed", e));
    }
    const link = getNotificationLink(n);
    if (!link) return;
    if (link.to === "/markets/$marketId") {
      navigate({ to: link.to, params: link.params });
    } else if ("search" in link && link.search) {
      navigate({ to: link.to, search: link.search });
    } else {
      navigate({ to: link.to });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-primary" />
          <h1 className="heading-page text-2xl">
            <span className="text-highlight">Notificações</span>
          </h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
              {unreadCount} nova{unreadCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={markingAll}
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
          >
            <CheckCheck className="size-3.5" />
            Marcar todas como lidas
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Toque em um item para ir ao mercado, carteira ou ranking.
      </p>

      <ul className="space-y-2">
        {notifications.length === 0 && (
          <li>
            <EmptyState
              icon={Bell}
              title={copy.empty.notifications.title}
              description={copy.empty.notifications.description}
              action={{
                label: copy.empty.notifications.cta,
                to: "/markets",
                search: { status: "live" },
              }}
              compact
            />
          </li>
        )}
        {notifications.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => go(n)}
              className="w-full rounded-xl border bg-card/60 p-4 text-left backdrop-blur transition hover:bg-surface/60 hover:border-primary/30"
            >
              {!n.read && (
                <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                  Nova
                </div>
              )}
              <div className="text-sm">{n.text}</div>
              <div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <span>{n.kind}</span>
                <span>·</span>
                <span>{formatDistanceToNow(n.time, { locale: ptBR, addSuffix: true })}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
