import { create } from "zustand";
import type { AuthModalMode } from "@/lib/auth-modal-search";

type AuthModalState = {
  open: boolean;
  mode: AuthModalMode;
  redirect?: string;
  upgrade: boolean;
  openLogin: (opts?: { redirect?: string }) => void;
  openSignup: (opts?: { redirect?: string; upgrade?: boolean }) => void;
  openForgot: () => void;
  setMode: (mode: AuthModalMode) => void;
  close: () => void;
};

export const useAuthModalStore = create<AuthModalState>((set) => ({
  open: false,
  mode: "login",
  redirect: undefined,
  upgrade: false,
  openLogin: (opts) =>
    set({ open: true, mode: "login", redirect: opts?.redirect, upgrade: false }),
  openSignup: (opts) =>
    set({
      open: true,
      mode: "signup",
      redirect: opts?.redirect,
      upgrade: opts?.upgrade ?? false,
    }),
  openForgot: () => set({ open: true, mode: "forgot" }),
  setMode: (mode) => set({ mode }),
  close: () => set({ open: false }),
}));
