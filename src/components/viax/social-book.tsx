import { useMarketBets } from "@/hooks/use-market-bets";
import { useFeed } from "@/hooks/use-feed";
import { useViaX } from "@/store/viax-store";
import { copy } from "@/copy/pt-BR";
import { formatBRL, formatPct, probability } from "@/lib/parimutuel";
import type { Market } from "@/store/viax-store";
import { TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SocialBook({ m }: { m: Market }) {
  const { data: bets, isLoading, isError } = useMarketBets(m.id);
  const { data: dbFeed } = useFeed(m.id);
  const zustandFeed = useViaX((s) => s.feed.filter((p) => p.marketId === m.id));
  const feedFallback = (dbFeed ?? zustandFeed).slice(0, 6);
  const pY = probability(m.pool, "YES");
  const showFeed = isError || (!isLoading && (!bets || bets.length === 0));

  return (
    <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-sm">
        <TrendingUp className="size-4 text-primary" /> {copy.markets.bookPressure}
      </div>
      <div className="mt-3 space-y-2 text-xs">
        {isLoading && <p className="text-muted-foreground">Carregando apostas recentes…</p>}
        {showFeed &&
          feedFallback.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <img src={p.user.avatar} alt="" className="size-6 rounded-full bg-surface" />
                <span className="truncate text-muted-foreground">@{p.user.handle}</span>
              </div>
              <span className="truncate text-foreground/80 max-w-[120px]">
                {p.text.slice(0, 40)}…
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatDistanceToNow(p.time, { locale: ptBR, addSuffix: true })}
              </span>
            </div>
          ))}
        {!showFeed && !isLoading && (!bets || bets.length === 0) && (
          <p className="text-muted-foreground">Nenhuma aposta recente neste mercado.</p>
        )}
        {!showFeed &&
          bets?.map((b, i) => (
            <div key={`${b.createdAt}-${i}`} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <img src={b.avatar} alt="" className="size-6 rounded-full bg-surface" />
                <span className="truncate text-muted-foreground">@{b.handle}</span>
              </div>
              <span className={`mono shrink-0 ${b.side === "YES" ? "text-up" : "text-down"}`}>
                {b.side === "YES" ? "+SIM" : "+NÃO"}
              </span>
              <span className="mono shrink-0 text-muted-foreground">{formatBRL(b.stake)}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatPct(b.side === "YES" ? pY : 1 - pY, 0)}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground/70">
                {formatDistanceToNow(b.createdAt, { locale: ptBR, addSuffix: true })}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
