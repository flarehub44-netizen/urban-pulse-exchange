import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useFeed } from "@/hooks/use-feed";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { createFeedPostFn } from "@/actions/feed";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useViaX } from "@/store/viax-store";
import { DivisionBadge } from "@/components/viax/division-badge";
import { Heart, MessageCircle, Repeat2, BadgeCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/feed")({
  head: () => ({ meta: [{ title: "Feed · ViaX" }, { name: "description", content: "Análises, alertas e previsões dos traders urbanos da ViaX." }] }),
  component: Feed,
});

const tagTone: Record<string, string> = {
  Alerta: "border-down/30 bg-down/10 text-down",
  Análise: "border-primary/30 bg-primary/10 text-primary",
  Previsão: "border-up/30 bg-up/10 text-up",
  Insight: "border-warn/30 bg-warn/10 text-warn",
};

function Feed() {
  const { data: dbFeed } = useFeed();
  const zustandFeed = useViaX((s) => s.feed);
  const feed = dbFeed ?? zustandFeed;
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const zustandMe = useViaX((s) => s.me);
  const me = profile ?? zustandMe;
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>

      <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
        <div className="flex gap-3">
          <img src={me.avatar} className="size-9 rounded-full bg-surface" alt="" />
          <div className="flex-1">
            <textarea
              value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Compartilhe uma análise ou alerta urbano..."
              className="w-full resize-none rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/60"
              rows={2}
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground">{text.length}/280</div>
              <button
                onClick={async () => {
                  if (!text.trim()) return;
                  try {
                    await createFeedPostFn({ data: { text: text.trim() } });
                    setText("");
                    queryClient.invalidateQueries({ queryKey: ["feed"] });
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

      <ul className="space-y-3">
        {feed.map((p) => (
          <li key={p.id} className="rounded-2xl border bg-card/60 p-4 backdrop-blur transition hover:bg-surface/30">
            <div className="flex gap-3">
              <img src={p.user.avatar} className="size-10 rounded-full bg-surface" alt="" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{p.user.name}</span>
                  <BadgeCheck className="size-3.5 text-primary" />
                  <span className="text-muted-foreground">@{p.user.handle}</span>
                  <DivisionBadge division={p.user.division} />
                  <span className="text-xs text-muted-foreground">· {formatDistanceToNow(p.time, { locale: ptBR, addSuffix: true })}</span>
                  {p.tag && <span className={`ml-auto rounded-md border px-2 py-0.5 text-[10px] ${tagTone[p.tag] ?? ""}`}>{p.tag}</span>}
                </div>
                <p className="mt-2 text-[15px] leading-relaxed">{p.text}</p>
                <div className="mt-3 flex items-center gap-6 text-xs text-muted-foreground">
                  <button className="inline-flex items-center gap-1.5 hover:text-down"><Heart className="size-4" /> {p.likes}</button>
                  <button className="inline-flex items-center gap-1.5 hover:text-primary"><MessageCircle className="size-4" /> {p.comments}</button>
                  <button className="inline-flex items-center gap-1.5 hover:text-up"><Repeat2 className="size-4" /> {p.reposts}</button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
