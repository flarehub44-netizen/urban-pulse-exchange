import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useFeed } from "@/hooks/use-feed";
import { useFeedComments } from "@/hooks/use-feed-comments";
import { useAuth } from "@/hooks/use-auth";
import {
  createFeedPostFn,
  likeFeedPostFn,
  repostFeedPostFn,
  commentFeedPostFn,
} from "@/actions/feed";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useResolvedFeed, useResolvedProfile, useResolvedMarkets } from "@/hooks/use-resolved-data";
import { DivisionBadge } from "@/components/viax/division-badge";
import {
  Heart,
  MessageCircle,
  Repeat2,
  BadgeCheck,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Link2,
} from "lucide-react";
import { copyShareUrl } from "@/lib/share-url";
import type { Market, Side } from "@/store/viax-store";
import { OrderBox } from "@/components/viax/order-box";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copy } from "@/copy/pt-BR";
import { EdgeBadge } from "@/components/viax/edge-badge";
import { probability, formatBRL, prizePool } from "@/lib/parimutuel";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { suggestMarketForPost } from "@/lib/suggest-feed-market";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/viax/empty-state";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/viax/page-header";
import { AppLoadingSkeleton } from "@/components/viax/app-loading-skeleton";

export type FeedSearch = { post?: string };

export const Route = createFileRoute("/_app/feed")({
  head: () => ({
    meta: [
      { title: "Feed · ViaX" },
      {
        name: "description",
        content: copy.feed.metaDescription,
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): FeedSearch => ({
    post: typeof search.post === "string" && search.post ? search.post : undefined,
  }),
  component: Feed,
});

const tagTone: Record<string, string> = {
  Alerta: "border-down/30 bg-down/10 text-down",
  Análise: "border-primary/30 bg-primary/10 text-primary",
  Previsão: "border-up/30 bg-up/10 text-up",
  Insight: "border-warn/30 bg-warn/10 text-warn",
};

function Feed() {
  const navigate = useNavigate({ from: "/feed" });
  const { post: postFromUrl } = Route.useSearch();
  useFeed();
  const { feed } = useResolvedFeed();
  const { markets } = useResolvedMarkets();
  const { userId } = useAuth();
  const { me } = useResolvedProfile();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<
    Record<string, { likes: number; comments: number; reposts: number }>
  >({});
  const [feedBet, setFeedBet] = useState<{ market: Market; side: Side } | null>(null);

  const { data: threadComments, isLoading: commentsLoading } = useFeedComments(commentPostId);

  useEffect(() => {
    if (postFromUrl && feed.some((p) => p.id === postFromUrl)) {
      setCommentPostId(postFromUrl);
    }
  }, [postFromUrl, feed]);

  if (!me) {
    return <AppLoadingSkeleton />;
  }

  const getCounts = (p: { id: string; likes: number; comments: number; reposts: number }) =>
    counts[p.id] ?? { likes: p.likes, comments: p.comments, reposts: p.reposts };

  const activePost = commentPostId ? feed.find((x) => x.id === commentPostId) : null;

  const openComments = (postId: string) => {
    setCommentPostId(postId);
    navigate({ search: { post: postId }, replace: true });
  };

  const closeComments = () => {
    setCommentPostId(null);
    navigate({ search: { post: undefined }, replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={<span className="text-highlight">Feed</span>} />

      <div className="surface-card p-4">
        <div className="flex gap-3">
          <img src={me.avatar} className="size-9 rounded-full bg-surface" alt={me.name} />
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Compartilhe uma análise ou alerta urbano..."
              className="w-full resize-none rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/60"
              rows={2}
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground">{text.length}/280</div>
              <button
                type="button"
                onClick={async () => {
                  if (!text.trim()) return;
                  try {
                    await createFeedPostFn({ data: { text: text.trim() } });
                    setText("");
                    queryClient.invalidateQueries({ queryKey: ["feed"] });
                    toast.success("Publicado!");
                  } catch {
                    toast.error("Erro ao publicar. Tente novamente.");
                  }
                }}
                disabled={!text.trim()}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90"
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      </div>

      {feed.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title={copy.empty.feed.title}
          description={copy.empty.feed.description}
          action={{ label: copy.empty.feed.cta, to: "/markets", search: { status: "live" } }}
        />
      )}

      <ul className="space-y-3">
        {feed.map((p) => {
          const c = getCounts(p);
          const liked = likedIds.has(p.id);
          const isRepost = p.text.startsWith("🔁");
          return (
            <li key={p.id} className="surface-card-interactive p-4 transition hover:bg-surface/30">
              <div className="flex gap-3">
                <img
                  src={p.user.avatar}
                  className="size-10 rounded-full bg-surface"
                  alt={p.user.name}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{p.user.name}</span>
                    <BadgeCheck className="size-3.5 text-primary" />
                    <span className="text-muted-foreground">@{p.user.handle}</span>
                    <DivisionBadge division={p.user.division} />
                    <span className="text-xs text-muted-foreground">
                      · {formatDistanceToNow(p.time, { locale: ptBR, addSuffix: true })}
                    </span>
                    {isRepost && (
                      <span className="ml-auto text-xs uppercase tracking-wider text-muted-foreground">
                        Repost
                      </span>
                    )}
                    {p.tag && !isRepost && (
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] ${tagTone[p.tag] ?? ""}`}
                      >
                        {p.tag}
                      </span>
                    )}
                    <button
                      type="button"
                      title="Copiar link do post"
                      onClick={() => copyShareUrl("/feed", { post: p.id })}
                      className="ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                    >
                      <Link2 className="size-3" /> Link
                    </button>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed">{p.text}</p>
                  {(() => {
                    const mkt = p.marketId
                      ? markets.find((m) => m.id === p.marketId)
                      : suggestMarketForPost(p.text, markets);
                    if (!mkt) return null;
                    const pY = probability(mkt.pool, "YES");
                    const suggested = !p.marketId;
                    return (
                      <div className="mt-3 rounded-xl border bg-surface/60 p-3">
                        {suggested && (
                          <div className="mb-2 text-xs uppercase tracking-wider text-primary">
                            Mercado sugerido para este post
                          </div>
                        )}
                        <Link
                          to="/markets/$marketId"
                          params={{ marketId: mkt.id }}
                          className="block transition hover:opacity-90"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                                {mkt.region}
                              </div>
                              <div className="mt-0.5 text-sm line-clamp-1 font-medium">
                                {mkt.question}
                              </div>
                            </div>
                            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="mono text-up">↑ SIM {(pY * 100).toFixed(0)}%</span>
                            <span className="mono text-down">
                              ↓ NÃO {((1 - pY) * 100).toFixed(0)}%
                            </span>
                            <EdgeBadge m={mkt} />
                            <span className="mono text-muted-foreground ml-auto">
                              {copy.feed.prize} {formatBRL(prizePool(mkt.pool))}
                            </span>
                          </div>
                        </Link>
                        {(mkt.status === "live" || mkt.status === "closing") && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setFeedBet({ market: mkt, side: "YES" })}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-up/30 bg-up/10 py-2 text-xs font-medium text-up hover:bg-up/20"
                            >
                              <ArrowUp className="size-3.5" /> {copy.feed.betYes}
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeedBet({ market: mkt, side: "NO" })}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-down/30 bg-down/10 py-2 text-xs font-medium text-down hover:bg-down/20"
                            >
                              <ArrowDown className="size-3.5" /> {copy.feed.betNo}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="mt-3 flex items-center gap-6 text-xs text-muted-foreground">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1.5 hover:text-down",
                        liked && "text-down",
                      )}
                      onClick={async () => {
                        if (p.id.startsWith("seed-")) {
                          setLikedIds((s) => new Set(s).add(p.id));
                          setCounts((prev) => ({
                            ...prev,
                            [p.id]: { ...getCounts(p), likes: getCounts(p).likes + 1 },
                          }));
                          return;
                        }
                        try {
                          const res = await likeFeedPostFn({ data: { postId: p.id } });
                          setLikedIds((s) => new Set(s).add(p.id));
                          setCounts((prev) => ({
                            ...prev,
                            [p.id]: { ...getCounts(p), likes: res.likes },
                          }));
                        } catch {
                          toast.error("Não foi possível curtir.");
                        }
                      }}
                    >
                      <Heart className={cn("size-4", liked && "fill-down")} /> {c.likes}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 hover:text-primary"
                      onClick={() => {
                        setCommentText("");
                        openComments(p.id);
                      }}
                    >
                      <MessageCircle className="size-4" /> {c.comments}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 hover:text-up"
                      onClick={async () => {
                        if (p.id.startsWith("seed-")) {
                          setCounts((prev) => ({
                            ...prev,
                            [p.id]: { ...getCounts(p), reposts: getCounts(p).reposts + 1 },
                          }));
                          toast.success("Repostado no feed!");
                          return;
                        }
                        try {
                          const res = await repostFeedPostFn({ data: { postId: p.id } });
                          setCounts((prev) => ({
                            ...prev,
                            [p.id]: { ...getCounts(p), reposts: res.reposts },
                          }));
                          queryClient.invalidateQueries({ queryKey: ["feed"] });
                          toast.success("Repostado no feed!");
                        } catch {
                          toast.error("Não foi possível repostar.");
                        }
                      }}
                    >
                      <Repeat2 className="size-4" /> {c.reposts}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!commentPostId} onOpenChange={(o) => !o && closeComments()}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
          <SheetHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <SheetTitle>Comentários</SheetTitle>
            {commentPostId && (
              <button
                type="button"
                onClick={() => copyShareUrl("/feed", { post: commentPostId })}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Link2 className="size-3" /> Copiar link
              </button>
            )}
          </SheetHeader>
          {activePost && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground border-b pb-3">
              {activePost.text}
            </p>
          )}
          <ul className="mt-3 max-h-48 space-y-3 overflow-auto">
            {commentsLoading && <li className="text-sm text-muted-foreground">Carregando...</li>}
            {!commentsLoading && commentPostId?.startsWith("seed-") && (
              <li className="text-sm text-muted-foreground">
                Comentários disponíveis após login com conta real.
              </li>
            )}
            {!commentsLoading &&
              threadComments?.map((c) => (
                <li key={c.id} className="flex gap-2 text-sm">
                  <img
                    src={c.user.avatar}
                    className="size-8 rounded-full bg-surface"
                    alt={c.user.name}
                  />
                  <div>
                    <span className="font-medium">{c.user.name}</span>{" "}
                    <span className="text-muted-foreground">@{c.user.handle}</span>
                    <p className="mt-0.5">{c.text}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(c.time, { locale: ptBR, addSuffix: true })}
                    </span>
                  </div>
                </li>
              ))}
            {!commentsLoading &&
              !commentPostId?.startsWith("seed-") &&
              threadComments?.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  Nenhum comentário ainda. Seja o primeiro!
                </li>
              )}
          </ul>
          <div className="mt-4 flex gap-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[72px] flex-1 resize-none rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/60"
              placeholder="Seu comentário..."
            />
            <button
              type="button"
              disabled={!commentText.trim()}
              className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
              onClick={async () => {
                if (!commentPostId || !commentText.trim()) return;
                const post = feed.find((x) => x.id === commentPostId);
                if (!post) return;
                if (commentPostId.startsWith("seed-")) {
                  setCounts((prev) => ({
                    ...prev,
                    [commentPostId]: { ...getCounts(post), comments: getCounts(post).comments + 1 },
                  }));
                  setCommentText("");
                  queryClient.invalidateQueries({ queryKey: ["feed-comments", commentPostId] });
                  toast.success("Comentário adicionado!");
                  return;
                }
                try {
                  const res = await commentFeedPostFn({
                    data: { postId: commentPostId, text: commentText.trim() },
                  });
                  setCounts((prev) => ({
                    ...prev,
                    [commentPostId]: { ...getCounts(post), comments: res.comments },
                  }));
                  setCommentText("");
                  queryClient.invalidateQueries({ queryKey: ["feed-comments", commentPostId] });
                  toast.success("Comentário publicado!");
                } catch {
                  toast.error("Erro ao comentar.");
                }
              }}
            >
              Enviar
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={feedBet !== null}
        onOpenChange={(open) => {
          if (!open) setFeedBet(null);
        }}
      >
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle className="text-sm font-medium leading-snug line-clamp-2">
              {feedBet?.market.question}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {feedBet?.market.region}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            {feedBet && (
              <OrderBox
                m={feedBet.market}
                initialSide={feedBet.side}
                onSuccess={() => setFeedBet(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
