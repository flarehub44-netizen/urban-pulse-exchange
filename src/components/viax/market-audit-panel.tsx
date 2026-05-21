import { useMarketAudit } from "@/hooks/use-market-audit";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { copy } from "@/copy/pt-BR";
import { formatBRL } from "@/lib/parimutuel";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function MarketAuditPanel({ marketId }: { marketId: string }) {
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);
  const { data, isLoading, error } = useMarketAudit(marketId);
  const showLedger = profile?.isAdmin === true || data?.is_admin === true;

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{copy.markets.auditLoading}</p>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-muted-foreground">{copy.markets.auditEmpty}</p>
    );
  }

  const { resolutions, ledger, snapshots } = data;

  return (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="font-medium">{copy.markets.auditResolutions}</h3>
        {resolutions.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{copy.markets.auditEmpty}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {resolutions.map((r) => (
              <li key={r.id} className="rounded-lg border bg-card/40 p-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-surface px-2 py-0.5 uppercase">{r.status}</span>
                  <span className="text-muted-foreground">{r.source}</span>
                  {r.derived_side && (
                    <span className="mono text-primary">→ {r.derived_side}</span>
                  )}
                </div>
                {r.raw_value != null && (
                  <p className="mt-1 mono text-xs">
                    {copy.markets.auditRaw}: {r.raw_value}
                    {r.confidence != null && ` · conf. ${(r.confidence * 100).toFixed(0)}%`}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-medium">{copy.markets.auditSnapshots}</h3>
        {snapshots.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{copy.markets.auditNoSnapshots}</p>
        ) : (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs mono">
            {snapshots.map((s, i) => (
              <li key={i} className="flex justify-between border-b border-border/50 py-1">
                <span>{s.raw_value}</span>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(s.recorded_at), { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showLedger && (
        <section>
          <h3 className="font-medium">{copy.markets.auditLedger}</h3>
          {ledger.length === 0 ? (
            <p className="mt-2 text-muted-foreground">—</p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs">
              {ledger.map((l, i) => (
                <li key={i} className="flex justify-between">
                  <span>{l.kind}</span>
                  <span className="mono">{formatBRL(Number(l.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
