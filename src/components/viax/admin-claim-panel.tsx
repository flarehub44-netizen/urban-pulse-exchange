import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { useClaimAdminInvite, useSyncAdminAllowlist } from "@/hooks/use-claim-admin";

export function AdminClaimPanel() {
  const [code, setCode] = useState("");
  const claim = useClaimAdminInvite();
  const sync = useSyncAdminAllowlist();

  const onClaim = async () => {
    if (!code.trim()) {
      toast.error(copy.settings.adminClaimNeedCode);
      return;
    }
    try {
      await claim.mutateAsync(code);
      toast.success(copy.settings.adminClaimSuccess);
      setCode("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.settings.adminClaimError);
    }
  };

  const onSyncEmail = async () => {
    try {
      const res = await sync.mutateAsync();
      if (res.is_admin) toast.success(copy.settings.adminClaimSuccess);
      else toast.message(copy.settings.adminClaimNoAllowlist);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.settings.adminClaimError);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        <KeyRound className="size-3.5" />
        {copy.settings.adminClaimTitle}
      </div>
      <p className="text-xs text-muted-foreground">{copy.settings.adminClaimDesc}</p>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={copy.settings.adminClaimPlaceholder}
        className="w-full rounded-lg border bg-surface px-3 py-2 text-sm"
        autoComplete="off"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={claim.isPending}
          onClick={onClaim}
          className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          {copy.settings.adminClaimBtn}
        </button>
        <button
          type="button"
          disabled={sync.isPending}
          onClick={onSyncEmail}
          className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-2 disabled:opacity-50"
        >
          {copy.settings.adminClaimSyncEmail}
        </button>
      </div>
    </div>
  );
}
