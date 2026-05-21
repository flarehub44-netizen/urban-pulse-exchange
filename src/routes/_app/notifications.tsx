import { copy } from "@/copy/pt-BR";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useNotifications } from "@/hooks/use-notifications";
import { useViaX } from "@/store/viax-store";
import { getNotificationLink } from "@/lib/notification-routes";
import { markNotificationsReadFn } from "@/actions/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell } from "lucide-react";
import { useEffect } from "react";

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
  const { data: dbNotifications } = useNotifications();
  const zustandNotifications = useViaX((s) => s.notifications);
  const notifications = dbNotifications ?? zustandNotifications;

  useEffect(() => {
    markNotificationsReadFn({ data: undefined })
      .then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }))
      .catch(() => {});
  }, [queryClient]);

  const go = (n: (typeof notifications)[0]) => {
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

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center gap-2">
        <Bell className="size-5 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Toque em um item para ir ao mercado, carteira ou ranking.
      </p>

      <ul className="space-y-2">
        {notifications.length === 0 && (
          <li className="rounded-xl border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação ainda.
          </li>
        )}
        {notifications.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => go(n)}
              className="w-full rounded-xl border bg-card/60 p-4 text-left backdrop-blur transition hover:bg-surface/60 hover:border-primary/30"
            >
              <div className="text-sm">{n.text}</div>
              <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{n.kind}</span>
                <span>·</span>
                <span>{formatDistanceToNow(n.time, { locale: ptBR, addSuffix: true })}</span>
                {!n.read && <span className="text-primary">Nova</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
