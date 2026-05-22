import { useState } from "react";
import { toast } from "sonner";
import { useRegions } from "@/hooks/use-regions";
import { useCreateMarket } from "@/hooks/use-create-market";
import { copy } from "@/copy/pt-BR";
import type { Market } from "@/store/viax-store";

import { MARKET_CATEGORY_FILTERS } from "@/lib/markets-catalog";

const categories = MARKET_CATEGORY_FILTERS;

function slugId(regionId: string) {
  const ts = Date.now().toString(36);
  return `${regionId}-${ts}`;
}

export function AdminCreateMarketForm() {
  const { data: regions } = useRegions();
  const { mutateAsync: create, isPending } = useCreateMarket();
  const [question, setQuestion] = useState("");
  const [regionId, setRegionId] = useState("");
  const [target, setTarget] = useState("5000");
  const [category, setCategory] = useState<Market["category"]>("Fluxo");
  const [hours, setHours] = useState("24");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const region = regions?.find((r) => r.id === regionId);
    if (!region) {
      toast.error(copy.settings.adminCreateNeedRegion);
      return;
    }
    const endsAt = new Date(Date.now() + Number(hours) * 60 * 60 * 1000);
    try {
      await create({
        id: slugId(regionId),
        question: question.trim() || copy.settings.adminCreateDefaultQuestion(region.name),
        region: region.name,
        target: Number(target),
        category,
        endsAt,
        regionId,
      });
      toast.success(copy.settings.adminCreateSuccess);
      setQuestion("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.settings.adminResolveError);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-card/40 p-4">
      <p className="text-xs font-medium text-muted-foreground">{copy.settings.adminCreateTitle}</p>
      <label className="block text-xs uppercase tracking-wider text-muted-foreground">
        {copy.settings.adminCreateQuestion}
      </label>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full rounded-lg border bg-surface px-3 py-2 text-sm"
        placeholder={copy.settings.adminCreateQuestionPh}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            Região
          </label>
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {(regions ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            Categoria
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Market["category"])}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            Meta (valor)
          </label>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm mono"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            Encerra em (horas)
          </label>
          <input
            type="number"
            min={1}
            max={168}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm mono"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending || !regionId}
        className="w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
      >
        {copy.settings.adminCreateBtn}
      </button>
    </form>
  );
}
