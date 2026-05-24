import { useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { useReportCommunityMarket } from "@/hooks/use-community-markets";
import { copy } from "@/copy/pt-BR";
import type { Market } from "@/store/viax-store";

export function CommunityReportButton({ market }: { market: Market }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { mutateAsync: report, isPending } = useReportCommunityMarket();

  if (market.marketKind !== "community") return null;

  const onSubmit = async () => {
    if (reason.trim().length < 5) {
      toast.error(copy.community.reportReasonMin);
      return;
    }
    try {
      const res = await report({ marketId: market.id, reason: reason.trim() });
      const payload = res as { already_reported?: boolean };
      toast.success(
        payload?.already_reported ? copy.community.reportAlready : copy.community.reportSuccess,
      );
      setOpen(false);
      setReason("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.errors.generic);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-warn"
      >
        <Flag className="size-3" />
        {copy.community.reportCta}
      </button>
    );
  }

  return (
    <div className="rounded-xl border bg-surface/60 p-3 space-y-2">
      <p className="text-xs font-medium">{copy.community.reportTitle}</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={copy.community.reportPlaceholder}
        className="w-full min-h-[60px] rounded-lg border bg-surface px-2 py-1.5 text-xs"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => void onSubmit()}
          className="rounded-lg bg-warn px-3 py-1 text-xs text-warn-foreground disabled:opacity-50"
        >
          {copy.community.reportSubmit}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground underline"
        >
          {copy.bet.confirmCancel}
        </button>
      </div>
    </div>
  );
}
