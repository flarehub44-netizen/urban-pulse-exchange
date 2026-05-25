import { useAuthModalStore } from "@/lib/auth-modal";

export function useAuthModal() {
  return useAuthModalStore();
}
