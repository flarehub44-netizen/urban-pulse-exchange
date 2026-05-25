import { create } from "zustand";
import type { AuthModalMode } from "@/lib/auth-modal-search";

type AuthModalState = {
  open: boolean;
  mode: AuthModalMode;
  redirect?: string;
  upgrade: boolean;
  openDepositAfter: boolean;
  openLogin: (opts?: { redirect?: string; depositAfter?: boolean }) => void;
  openSignup: (opts?: { redirect?: string; upgrade?: boolean; depositAfter?: boolean }) => void;
  openForgot: () => void;
  setMode: (mode: AuthModalMode) => void;
  close: () => void;
};

export const useAuthModalStore = create<AuthModalState>((set) => ({
  open: false,
  mode: "login",
  redirect: undefined,
  upgrade: false,
  openDepositAfter: false,
  openLogin: (opts) =>
    set({
      open: true,
      mode: "login",
      redirect: opts?.redirect,
      upgrade: false,
      openDepositAfter: opts?.depositAfter ?? false,
    }),
  openSignup: (opts) =>
    set({
      open: true,
      mode: "signup",
      redirect: opts?.redirect,
      upgrade: opts?.upgrade ?? false,
      openDepositAfter: opts?.depositAfter ?? false,
    }),
  openForgot: () => set({ open: true, mode: "forgot", openDepositAfter: false }),
  setMode: (mode) => set({ mode }),
  close: () => set({ open: false, openDepositAfter: false }),
}));
