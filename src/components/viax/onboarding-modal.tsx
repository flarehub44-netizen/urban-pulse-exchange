import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowUpCircle, ArrowDownCircle, Trophy, ChevronRight, X, Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "viax_onboarded";

const stepData = [
  {
    color: "from-primary/20 to-primary/5",
    title: "Escolha um mercado",
    body: "Cada mercado é uma pergunta real sobre o trânsito de São Paulo: o fluxo na Paulista vai passar de 800 carros/h entre 18h–19h hoje?",
    visual: (
      <div className="mt-4 rounded-xl border border-primary/30 bg-background/50 p-3 text-sm">
        <div className="text-[10px] uppercase tracking-wider text-primary">Ao vivo · Paulista</div>
        <div className="mt-1 font-medium leading-snug">
          O fluxo na Av. Paulista vai passar de 800 carros/h entre 18h–19h?
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-up">SIM 62%</span>
          <div className="h-1.5 flex-1 mx-3 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-[62%] rounded-full bg-up" />
          </div>
          <span className="font-semibold text-down">NÃO 38%</span>
        </div>
      </div>
    ),
    finishTo: undefined as string | undefined,
  },
  {
    color: "from-up/15 to-primary/5",
    title: "Aposte SIM ou NÃO",
    body: "Escolha um lado e defina o valor. As probabilidades mudam conforme as apostas chegam — entre cedo para as melhores odds.",
    visual: (
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="flex items-center justify-center gap-1.5 rounded-xl border border-up/40 bg-up/15 px-3 py-2.5 text-sm font-semibold text-up">
          <ArrowUpCircle className="size-4" /> SIM
        </div>
        <div className="flex items-center justify-center gap-1.5 rounded-xl border border-down/30 bg-down/10 px-3 py-2.5 text-sm font-medium text-down/70">
          <ArrowDownCircle className="size-4" /> NÃO
        </div>
        <div className="col-span-2 rounded-xl border bg-background/50 px-3 py-2 text-center text-xs text-muted-foreground">
          Valor: <span className="font-semibold text-foreground">R$ 10,00</span> · Ganho estimado:{" "}
          <span className="font-semibold text-up">R$ 16,10</span>
        </div>
      </div>
    ),
    finishTo: undefined as string | undefined,
  },
  {
    color: "from-warn/20 to-primary/5",
    title: "Ganhe com precisão",
    body: "90% do prêmio vai para quem acertou. Cada acerto melhora seu ranking e desbloqueia conquistas.",
    visual: (
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-3 rounded-xl border border-up/30 bg-up/10 p-3 text-sm">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-up/30 bg-up/20 font-bold text-up">
            W
          </div>
          <div>
            <div className="font-medium">Apostou SIM · Acertou!</div>
            <div className="text-xs text-up">+R$ 6,10 creditado</div>
          </div>
          <Trophy className="ml-auto size-4 text-warn" />
        </div>
        <div className="flex items-center justify-between rounded-xl border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
          <span>Precisão</span>
          <span className="font-semibold text-foreground">68,5%</span>
          <span>Ranking</span>
          <span className="font-semibold text-foreground">#42</span>
        </div>
      </div>
    ),
    finishTo: undefined as string | undefined,
  },
  {
    color: "from-primary/15 via-primary/5 to-card/30",
    title: "A IA que te ajuda a ganhar",
    body: "O UrbanMind analisa 14 dias de dados de fluxo, clima e padrões históricos para indicar o lado com maior vantagem em cada mercado.",
    visual: (
      <div className="mt-4 space-y-2">
        <div className="rounded-xl border border-primary/30 bg-background/50 p-3">
          <div className="flex items-center gap-2 text-xs text-primary">
            <Brain className="size-3.5" /> UrbanMind AI · Ibirapuera
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-up font-medium">↑ SIM</span>
            <div className="flex-1 mx-3 space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full w-[76%] rounded-full bg-primary" />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Confiança IA</span>
                <span className="text-primary font-medium">76%</span>
              </div>
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-center text-xs font-medium text-primary">
            Vantagem: +14 p.p. acima do pool
          </div>
        </div>
      </div>
    ),
    finishTo: "/urbanmind",
  },
];

export function OnboardingModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const close = () => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const finish = () => {
    close();
    const target = stepData[step]?.finishTo;
    if (target === "/urbanmind") {
      navigate({ to: "/urbanmind" });
    } else {
      navigate({ to: "/markets", search: { status: "live" } });
    }
  };

  const next = () => {
    if (step < stepData.length - 1) setStep(step + 1);
    else finish();
  };

  const current = stepData[step];
  const isLast = step === stepData.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="max-w-sm overflow-hidden p-0">
        <div className={cn("bg-gradient-to-br p-6", current.color)}>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {stepData.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === step
                      ? "w-8 bg-primary"
                      : i < step
                        ? "w-5 bg-primary/50"
                        : "w-5 bg-border",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-1 text-muted-foreground hover:bg-surface/60"
              aria-label="Pular tutorial"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Passo {step + 1} de {stepData.length}
          </div>
          <h2 className="mt-2 text-xl font-semibold">{current.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{current.body}</p>
          {current.visual}
        </div>
        <div className="flex items-center justify-between gap-3 border-t bg-card p-4">
          <button
            type="button"
            onClick={close}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Pular
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {isLast && current.finishTo === "/urbanmind" ? (
              <>
                <Brain className="size-3.5" /> Explorar UrbanMind
              </>
            ) : isLast ? (
              <>
                <Zap className="size-3.5" /> Fazer minha primeira aposta
              </>
            ) : (
              <>
                Próximo <ChevronRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
