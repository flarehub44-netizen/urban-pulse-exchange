import { useState } from "react";
import { toast } from "sonner";
import { copy } from "@/copy/pt-BR";
import {
  useAdminMonthlyImpactWinners,
  useAdminMarkImpactPrizeFulfilled,
} from "@/hooks/use-admin-impact";

function currentMonthInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function AdminImpactWinnersPanel() {
  const [month, setMonth] = useState(currentMonthInput());
  const { data: winners = [], isLoading, refetch } = useAdminMonthlyImpactWinners(month);
  const { mutateAsync: markFulfilled, isPending } = useAdminMarkImpactPrizeFulfilled();

  return (
    <section className="space-y-4 rounded-2xl border bg-card/60 p-4">
      <div>
        <h2 className="text-sm font-semibold">{copy.admin.community.impactWinnersTitle}</h2>
        <p className="text-xs text-muted-foreground">{copy.admin.community.impactWinnersSubtitle}</p>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">{copy.admin.community.impactMonthLabel}</span>
        <input
          type="month"
          className="max-w-xs rounded-lg border bg-background px-3 py-2"
          value={month.slice(0, 7)}
          onChange={(e) => setMonth(`${e.target.value}-01`)}
        />
      </label>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : winners.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.admin.community.impactWinnersEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {winners.map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2"
            >
              <div>
                <span className="font-semibold">#{w.rank}</span>{" "}
                <span className="text-sm">
                  @{w.handle} · {w.xp_total} XP
                </span>
                <p className="text-xs text-muted-foreground">{w.prize_label}</p>
              </div>
              {w.fulfilled_at ? (
                <span className="text-xs text-up">{copy.impact.fulfilledBadge}</span>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/15 disabled:opacity-50"
                  onClick={async () => {
                    try {
                      await markFulfilled({ winner_id: w.id });
                      toast.success(copy.admin.community.prizeFulfilled);
                      refetch();
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : copy.errors.generic);
                    }
                  }}
                >
                  {copy.admin.community.markPrizeFulfilled}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
