import { create } from "zustand";
import type { AuthModalMode } from "@/lib/auth-modal-search";

type AuthModalState = {
  open: boolean;
  mode: AuthModalMode;
  redirect?: string;
  openDepositAfter: boolean;
  openLogin: (opts?: { redirect?: string; depositAfter?: boolean }) => void;
  openSignup: (opts?: { redirect?: string; depositAfter?: boolean }) => void;
  openForgot: () => void;
  setMode: (mode: AuthModalMode) => void;
  close: () => void;
};

export const useAuthModalStore = create<AuthModalState>((set) => ({
  open: false,
  mode: "login",
  redirect: undefined,
  openDepositAfter: false,
  openLogin: (opts) =>
    set({
      open: true,
      mode: "login",
      redirect: opts?.redirect,
      openDepositAfter: opts?.depositAfter ?? false,
    }),
  openSignup: (opts) =>
    set({
      open: true,
      mode: "signup",
      redirect: opts?.redirect,
      openDepositAfter: opts?.depositAfter ?? false,
    }),
  openForgot: () => set({ open: true, mode: "forgot", openDepositAfter: false }),
  setMode: (mode) => set({ mode }),
  close: () => set({ open: false, openDepositAfter: false }),
}));
