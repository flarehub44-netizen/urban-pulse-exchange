import { useRef, useState } from "react";
import { useCatalogMarkets } from "@/hooks/use-markets";
import { probability, formatPct } from "@/lib/parimutuel";
import { copy } from "@/copy/pt-BR";

type Template = "story" | "banner" | "odds";

export function CreativeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markets = useCatalogMarkets();
  const [template, setTemplate] = useState<Template>("story");
  const live = markets.find((m) => m.status === "live") ?? markets[0];
  const pYes = live ? probability(live.pool, "YES") : 0.5;

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = template === "story" ? 360 : 600;
    const h = template === "story" ? 640 : template === "banner" ? 200 : 320;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0f172a");
    g.addColorStop(1, "#1e3a5f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#22d3a8";
    ctx.font = "bold 14px system-ui";
    ctx.fillText("ViaX · Previsão urbana", 20, 36);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 22px system-ui";
    const q = live?.question?.slice(0, 48) ?? "Mercado ao vivo";
    ctx.fillText(q + (live && live.question.length > 48 ? "…" : ""), 20, 80);

    ctx.font = "16px system-ui";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(live?.region ?? "São Paulo", 20, 108);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 28px system-ui";
    const line =
      template === "odds"
        ? copy.partner.creativeYesPct(formatPct(pYes))
        : `🔥 ${formatPct(pYes)} na ${live?.region ?? "cidade"}`;
    ctx.fillText(line, 20, h - 60);

    ctx.fillStyle = "#64748b";
    ctx.font = "12px system-ui";
    ctx.fillText("viax.com · creator", 20, h - 24);
  };

  const download = () => {
    draw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `viax-creative-${template}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["story", "banner", "odds"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTemplate(t)}
            className={`rounded-lg border px-3 py-1.5 text-xs capitalize ${template === t ? "border-primary bg-primary/15" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="rounded-xl border bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white max-w-md">
        <p className="text-xs text-emerald-400">ViaX</p>
        <p className="mt-2 font-semibold">{live?.question?.slice(0, 60) ?? "Mercado"}</p>
        <p className="mt-4 text-2xl font-bold text-amber-400">{formatPct(pYes)} SIM</p>
      </div>
      <button
        type="button"
        onClick={download}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        {copy.partner.creativeDownload}
      </button>
    </div>
  );
}
