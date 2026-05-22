import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  usePartnerCampaigns,
  useCreatePartnerCampaign,
  usePartnerOverview,
} from "@/hooks/use-partner";
import { buildPartnerUrl, copyShareUrl } from "@/lib/share-url";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/partner/campaigns")({
  component: PartnerCampaignsPage,
});

function PartnerCampaignsPage() {
  const { data: campaigns } = usePartnerCampaigns();
  const { data: o } = usePartnerOverview();
  const { mutateAsync: create, isPending } = useCreatePartnerCampaign();
  const [name, setName] = useState("");
  const [suffix, setSuffix] = useState("");

  const onCreate = async () => {
    if (!name.trim()) return;
    try {
      const res = await create({ name, slugSuffix: suffix || undefined });
      toast.success("Campanha criada");
      await copyShareUrl(res.link_path);
      setName("");
      setSuffix("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{copy.partner.nav.campaigns}</h1>
      <div className="rounded-xl border bg-card/60 p-4 space-y-3">
        <input
          placeholder="Nome da campanha"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border bg-surface px-3 py-2 text-sm"
        />
        <input
          placeholder="Sufixo URL (opcional) ex: paulista-trader"
          value={suffix}
          onChange={(e) => setSuffix(e.target.value)}
          className="w-full rounded-lg border bg-surface px-3 py-2 text-sm mono"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={onCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          Criar link
        </button>
        {o?.slug && (
          <p className="text-xs text-muted-foreground">Link base: {buildPartnerUrl(o.slug)}</p>
        )}
      </div>
      <div className="space-y-2">
        {(campaigns ?? []).map((c) => {
          const path = `/r/${o?.slug ?? ""}${c.slug_suffix ? `/${c.slug_suffix}` : ""}`;
          const conv = c.clicks > 0 ? ((c.conversions / c.clicks) * 100).toFixed(1) : "0";
          return (
            <div key={c.id} className="rounded-xl border p-4 flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-medium">{c.name}</div>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline mono"
                  onClick={() => copyShareUrl(path)}
                >
                  {path}
                </button>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {c.clicks} clicks · {c.conversions} conv · {conv}% ROI proxy
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
