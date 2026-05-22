import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dices } from "lucide-react";
import { copy } from "@/copy/pt-BR";
import { useCasinoEnabled } from "@/hooks/use-casino-enabled";
import { useCasinoDailySpin, useCasinoSpinStatus } from "@/hooks/use-casino-spin";
import { cn } from "@/lib/utils";
import type { SpinResult } from "@/actions/casino";

const SECTORS = [
  { key: "balance_25", label: "R$ 25", color: "hsl(160 70% 42%)" },
  { key: "xp_50", label: "50 XP", color: "hsl(220 80% 55%)" },
  { key: "near_miss_jackpot", label: "JACKPOT", color: "hsl(45 95% 52%)" },
  { key: "balance_75", label: "R$ 75", color: "hsl(280 65% 55%)" },
  { key: "balance_200", label: "R$ 200", color: "hsl(0 75% 55%)" },
] as const;

const SECTOR_DEG = 360 / SECTORS.length;

function sectorIndex(key: string): number {
  const i = SECTORS.findIndex((s) => s.key === key);
  return i >= 0 ? i : 0;
}

const DISCLAIMER_KEY = "viax_spin_disclaimer_seen";

type SpinWheelProps = {
  onNearMissSpin?: (result: SpinResult) => void;
  onDepositBonusCta?: () => void;
};

export function SpinWheel({ onNearMissSpin, onDepositBonusCta }: SpinWheelProps) {
  const { enabled } = useCasinoEnabled();
  const { data: status } = useCasinoSpinStatus();
  const { mutateAsync: spin, isPending } = useCasinoDailySpin();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    setShowDisclaimer(!localStorage.getItem(DISCLAIMER_KEY));
  }, []);

  const dismissDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_KEY, "1");
    setShowDisclaimer(false);
  };

  const runSpin = useCallback(async () => {
    if (!status?.daily_available || spinning) return;
    try {
      setSpinning(true);
      const res = await spin();
      if (res.already_spun) {
        toast.message(copy.casino.alreadySpunToday);
        setSpinning(false);
        return;
      }
      setLastResult(res);
      const idx = sectorIndex(res.outcome_key ?? "balance_25");
      const overshoot = res.is_near_miss ? SECTOR_DEG * 0.35 : 0;
      const target = 360 * 5 + (360 - idx * SECTOR_DEG - SECTOR_DEG / 2) + overshoot;
      setRotation((r) => r + target);
      setTimeout(() => {
        setSpinning(false);
        if (res.is_near_miss) {
          onNearMissSpin?.(res);
        }
        toast.success(copy.casino.spinWin(res.label ?? res.outcome_key ?? ""));
      }, 4200);
    } catch (e: unknown) {
      setSpinning(false);
      toast.error(e instanceof Error ? e.message : copy.errors.generic);
    }
  }, [spin, spinning, status?.daily_available, onNearMissSpin]);

  if (!enabled) return null;

  const available = status?.daily_available !== false;

  return (
    <div className="rounded-2xl border border-warn/30 bg-gradient-to-br from-warn/10 via-card/80 to-card/60 p-4 backdrop-blur">
      {showDisclaimer && (
        <p className="mb-3 rounded-lg border border-warn/20 bg-warn/5 px-3 py-2 text-xs text-muted-foreground">
          {copy.responsiblePlay.disclaimerShort}{" "}
          <button type="button" className="text-primary underline" onClick={dismissDisclaimer}>
            {copy.responsiblePlay.understood}
          </button>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative mx-auto size-40 shrink-0 sm:mx-0">
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
            style={{
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "14px solid var(--color-warn)",
            }}
          />
          <div
            className={cn(
              "size-40 rounded-full border-4 border-warn/40 shadow-inner transition-transform duration-[4000ms] ease-out",
              spinning && "pointer-events-none",
            )}
            style={{
              transform: `rotate(${rotation}deg)`,
              background: `conic-gradient(${SECTORS.map(
                (s, i) => `${s.color} ${i * SECTOR_DEG}deg ${(i + 1) * SECTOR_DEG}deg`,
              ).join(", ")})`,
            }}
          >
            <div className="absolute inset-4 flex items-center justify-center rounded-full bg-card text-center">
              <Dices className="size-8 text-warn" />
            </div>
          </div>
          {SECTORS.map((s, i) => {
            const ang = i * SECTOR_DEG + SECTOR_DEG / 2;
            return (
              <span
                key={s.key}
                className="pointer-events-none absolute left-1/2 top-1/2 w-16 -translate-x-1/2 -translate-y-1/2 text-center text-[9px] font-bold uppercase tracking-tight text-white drop-shadow"
                style={{
                  transform: `rotate(${ang}deg) translateY(-52px) rotate(-${ang}deg)`,
                }}
              >
                {s.label}
              </span>
            );
          })}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{copy.casino.wheelTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{copy.casino.wheelDesc}</p>
          {lastResult?.is_near_miss && (
            <p className="mt-2 text-xs font-medium text-warn">{copy.casino.nearMissJackpot}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!available || isPending || spinning}
              onClick={runSpin}
              className="rounded-lg bg-warn px-4 py-2 text-sm font-semibold text-warn-foreground disabled:opacity-50"
            >
              {available ? copy.casino.spinFree : copy.casino.alreadySpunToday}
            </button>
            {onDepositBonusCta && (
              <button
                type="button"
                onClick={onDepositBonusCta}
                className="rounded-lg border px-3 py-2 text-xs hover:bg-muted/50"
              >
                {copy.casino.depositBonusCta}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
