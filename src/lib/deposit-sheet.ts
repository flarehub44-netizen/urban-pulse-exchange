import { create } from "zustand";
import { trackDepositFunnel } from "@/lib/deposit-funnel";

type DepositSheetState = {
  open: boolean;
  suggestedAmount: number;
  openDeposit: (opts?: { amount?: number; source?: string }) => void;
  close: () => void;
};

export const useDepositSheetStore = create<DepositSheetState>((set) => ({
  open: false,
  suggestedAmount: 200,
  openDeposit: (opts) => {
    trackDepositFunnel("deposit_sheet_open", { source: opts?.source ?? "cta" });
    set({
      open: true,
      suggestedAmount: opts?.amount ?? 200,
    });
  },
  close: () => set({ open: false }),
}));
