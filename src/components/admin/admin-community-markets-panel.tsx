import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAdminCommunityMarkets,
  useAdminCommunityReports,
  useAdminVoidCommunityMarket,
} from "@/hooks/use-admin-community";
import { formatBRL } from "@/lib/parimutuel";
import { copy } from "@/copy/pt-BR";
import { InlineError } from "@/components/viax/inline-error";

type Filter = "all" | "open" | "private" | "reported";

const OPEN_STATUSES = new Set(["live", "closing", "closed"]);

export function AdminCommunityMarketsPanel() {
  const { data: markets = [], isError, refetch, isLoading } = useAdminCommunityMarkets();
  const { data: reports = [] } = useAdminCommunityReports();
  const { mutateAsync: voidMarket, isPending: voiding } = useAdminVoidCommunityMarket();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    return markets.filter((m) => {
      if (filter === "open") return OPEN_STATUSES.has(m.status);
      if (filter === "private") return m.visibility === "unlisted";
      if (filter === "reported") return (m.pending_reports ?? 0) > 0;
      return true;
    });
  }, [markets, filter]);

  if (isError) return <InlineError onRetry={() => refetch()} />;

  const onVoid = async (marketId: string) => {
    if (!window.confirm(copy.community.voidConfirm)) return;
    try {
      await voidMarket({ marketId, reason: "admin_moderation" });
      toast.success(copy.community.voidSuccess);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : copy.errors.generic);
    }
  };

  const onCopyInvite = async (marketId: string, token: string) => {
    const url = `${window.location.origin}/markets/${marketId}?t=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(copy.admin.community.inviteCopied);
    } catch {
      toast.error(copy.errors.generic);
    }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: copy.admin.community.filterAll },
    { key: "open", label: copy.admin.community.filterOpen },
    { key: "private", label: copy.admin.community.filterPrivate },
    { key: "reported", label: copy.admin.community.filterReported },
  ];

  return (
    <div className="space-y-6">
      {reports.length > 0 && (
        <div className="rounded-xl border border-warn/30 bg-warn/5 p-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-warn">
            {copy.community.adminReportsTitle}
          </h2>
          <ul className="space-y-2 text-xs">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg border bg-surface/60 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/markets/$marketId"
                    params={{ marketId: r.market_id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.question}
                  </Link>
                  {r.visibility === "unlisted" && (
                    <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {copy.community.privateBadge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-muted-foreground">
                  {r.reporter_username}: {r.reason}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              filter === f.key
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-surface-2"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="self-center text-[10px] text-muted-foreground">
          {isLoading ? "…" : `${filtered.length} evento(s)`}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[800px] text-xs">
          <thead className="border-b bg-surface/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Pergunta</th>
              <th className="px-3 py-2 text-left">Criador</th>
              <th className="px-3 py-2 text-left">Vis.</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Volume</th>
              <th className="px-3 py-2 text-right">{copy.admin.community.betsCount}</th>
              <th className="px-3 py-2 text-left">Denúncias</th>
              <th className="px-3 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-border/40">
                <td className="max-w-[220px] truncate px-3 py-2 font-medium">{m.question}</td>
                <td className="px-3 py-2">{m.creator_username ?? "—"}</td>
                <td className="px-3 py-2">
                  {m.visibility === "unlisted" ? (
                    <span className="rounded bg-warn/10 px-1.5 py-0.5 text-[10px] text-warn">
                      {copy.community.privateBadge}
                    </span>
                  ) : (
                    "público"
                  )}
                </td>
                <td className="px-3 py-2">{m.status}</td>
                <td className="px-3 py-2 text-right mono">{formatBRL(Number(m.volume))}</td>
                <td className="px-3 py-2 text-right mono">{m.bets_count ?? 0}</td>
                <td className="px-3 py-2">
                  {(m.pending_reports ?? 0) > 0 ? (
                    <span className="text-warn">{m.pending_reports}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Link
                      to="/markets/$marketId"
                      params={{ marketId: m.id }}
                      className="rounded border px-2 py-0.5 hover:bg-surface"
                    >
                      Ver
                    </Link>
                    {m.visibility === "unlisted" && m.access_token && (
                      <button
                        type="button"
                        onClick={() => void onCopyInvite(m.id, m.access_token!)}
                        className="rounded border px-2 py-0.5 hover:bg-surface"
                      >
                        {copy.admin.community.copyInvite}
                      </button>
                    )}
                    {m.status !== "settled" && m.status !== "void" && (
                      <button
                        type="button"
                        disabled={voiding}
                        onClick={() => void onVoid(m.id)}
                        className="rounded border border-down/40 px-2 py-0.5 text-down disabled:opacity-50"
                      >
                        {copy.community.adminVoidCommunity}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {copy.admin.community.empty}
          </p>
        )}
      </div>
    </div>
  );
}
