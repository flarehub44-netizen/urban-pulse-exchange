import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { copy } from "@/copy/pt-BR";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Coins, Zap, Trophy, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "viax_onboarded";

const steps = [
  {
    Icon: Coins,
    color: "from-primary/20 to-primary/5",
    title: copy.onboarding.step1Title,
    body: copy.onboarding.step1Body,
  },
  {
    Icon: Zap,
    color: "from-up/20 to-up/5",
    title: copy.onboarding.step2Title,
    body: copy.onboarding.step2Body,
  },
  {
    Icon: Trophy,
    color: "from-warn/20 to-warn/5",
    title: copy.onboarding.step3Title,
    body: copy.onboarding.step3Body,
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
    navigate({ to: "/markets", search: { status: "live" } });
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  };

  const { Icon, color, title, body } = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="max-w-sm overflow-hidden p-0">
        <div className={cn("bg-gradient-to-br p-6", color)}>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all",
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
              aria-label={copy.onboarding.skip}
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-6 inline-flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background/40">
            <Icon className="size-6 text-primary" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t bg-card p-4">
          <button
            type="button"
            onClick={close}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {copy.onboarding.skip}
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {isLast ? copy.onboarding.finish : copy.onboarding.next}
            {!isLast && <ChevronRight className="size-4" />}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
