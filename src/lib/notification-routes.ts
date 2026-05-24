import type { ViaXNotification } from "@/store/viax-store";

export type NotificationLink =
  | { to: "/profile"; search: { tab: "carteira" } }
  | { to: "/profile"; search: { tab: "posicoes" } }
  | { to: "/ranking" }
  | {
      to: "/markets";
      search?: { status?: "all" | "live" | "closing" | "dispute" | "resolved" | "draft" };
    }
  | { to: "/markets/$marketId"; params: { marketId: string } }
  | { to: "/football/$marketId"; params: { marketId: string } }
  | { to: "/live" }
  | null;

/** Resolve navigation target from notification kind + optional marketId */
export function getNotificationLink(n: ViaXNotification): NotificationLink {
  if (n.marketId?.startsWith("fb-")) {
    return { to: "/football/$marketId", params: { marketId: n.marketId } };
  }
  if (n.marketId) {
    return { to: "/markets/$marketId", params: { marketId: n.marketId } };
  }
  switch (n.kind) {
    case "win":
    case "refund":
    case "void":
      return { to: "/profile", search: { tab: "carteira" } };
    case "rank":
      return { to: "/ranking" };
    case "market":
      return { to: "/markets", search: { status: "live" } };
    case "alert":
    case "closing":
      if (n.marketId?.startsWith("fb-")) {
        return { to: "/football/$marketId", params: { marketId: n.marketId } };
      }
      return n.marketId
        ? { to: "/markets/$marketId", params: { marketId: n.marketId } }
        : { to: "/live" };
    default:
      return { to: "/profile", search: { tab: "posicoes" } };
  }
}
