import { useState } from "react";
import { toast } from "sonner";
import { MARKET_VERTICALS, type MarketVertical } from "@/lib/catalog-market";
import { useAdminCreatePredictionMarket } from "@/hooks/admin/use-admin-prediction-markets";

type OutcomeDraft = { slug: string; label: string };

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function AdminCreatePredictionMarketForm() {
  const { mutateAsync: create, isPending } = useAdminCreatePredictionMarket();
  const [question, setQuestion] = useState("");
  const [marketId, setMarketId] = useState("");
  const [vertical, setVertical] = useState<MarketVertical>("politica");
  const [hours, setHours] = useState("168");
  const [collectionSlug, setCollectionSlug] = useState("");
  const [publish, setPublish] = useState(true);
  const [outcomes, setOutcomes] = useState<OutcomeDraft[]>([
    { slug: "a", label: "Opção A" },
    { slug: "b", label: "Opção B" },
  ]);

  const addOutcome = () => {
    setOutcomes((prev) => [...prev, { slug: `o${prev.length + 1}`, label: "" }]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 5) {
      toast.error("Pergunta muito curta");
      return;
    }
    const cleaned = outcomes.filter((o) => o.label.trim());
    if (cleaned.length < 2) {
      toast.error("Adicione ao menos 2 outcomes");
      return;
    }
    const id = marketId.trim() || `pm-${slugify(q).slice(0, 40)}-${Date.now().toString(36)}`;
    const endsAt = new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString();
    try {
      await create({
        data: {
          id,
          question: q,
          vertical,
          endsAt,
          outcomes: cleaned.map((o, i) => ({
            slug: o.slug.trim() || slugify(o.label) || `o${i + 1}`,
            label: o.label.trim(),
            sort_order: i + 1,
          })),
          collectionSlug: collectionSlug.trim() || undefined,
          publish,
        },
      });
      toast.success("Mercado multi-outcome criado");
      setQuestion("");
      setMarketId("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar mercado");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-card/40 p-4">
      <p className="text-xs font-medium text-muted-foreground">
        Novo mercado multi-outcome (N vias)
      </p>
      <label className="block text-xs uppercase tracking-wider text-muted-foreground">
        Pergunta
      </label>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full rounded-lg border bg-surface px-3 py-2 text-sm"
        placeholder="Ex.: Quem vence a eleição?"
        required
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            ID (opcional)
          </label>
          <input
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
            placeholder="pm-exemplo-2026"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            Vertical
          </label>
          <select
            value={vertical}
            onChange={(e) => setVertical(e.target.value as MarketVertical)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
          >
            {MARKET_VERTICALS.map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            Fecha em (horas)
          </label>
          <input
            type="number"
            min={1}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            Collection (opcional)
          </label>
          <input
            value={collectionSlug}
            onChange={(e) => setCollectionSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
            placeholder="copa-2026"
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Outcomes</span>
          <button
            type="button"
            onClick={addOutcome}
            className="text-xs text-primary hover:underline"
          >
            + Outcome
          </button>
        </div>
        {outcomes.map((o, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              value={o.label}
              onChange={(e) =>
                setOutcomes((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                )
              }
              className="rounded-lg border bg-surface px-3 py-2 text-sm"
              placeholder="Label"
            />
            <input
              value={o.slug}
              onChange={(e) =>
                setOutcomes((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, slug: e.target.value } : x)),
                )
              }
              className="rounded-lg border bg-surface px-3 py-2 text-sm"
              placeholder="slug"
            />
            <button
              type="button"
              disabled={outcomes.length <= 2}
              onClick={() => setOutcomes((prev) => prev.filter((_, j) => j !== i))}
              className="rounded-lg border px-2 text-xs text-muted-foreground disabled:opacity-40"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        Publicar ao vivo
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {isPending ? "Criando…" : "Criar mercado multi-outcome"}
      </button>
    </form>
  );
}
