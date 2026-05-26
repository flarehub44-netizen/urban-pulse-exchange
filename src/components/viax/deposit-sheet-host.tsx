import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { QuickDepositSheet } from "@/components/viax/quick-deposit-sheet";
import { useDepositSheet } from "@/hooks/use-deposit-sheet";
import { useAuth } from "@/hooks/use-auth";
import { parseAuthModalSearch, stripAuthModalSearch } from "@/lib/auth-modal-search";

export function DepositSheetHost() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const { isRegistered } = useAuth();
  const { open, suggestedAmount, openDeposit, close } = useDepositSheet();
  const urlDeposit = parseAuthModalSearch(search).deposit === "1";
  const urlSynced = useRef(false);

  useEffect(() => {
    if (!urlDeposit || !isRegistered) {
      urlSynced.current = false;
      return;
    }
    if (urlSynced.current) return;
    urlSynced.current = true;
    openDeposit({ source: "url" });
  }, [urlDeposit, isRegistered, openDeposit]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      close();
      if (urlDeposit) {
        navigate({
          search: ((prev: any) => stripAuthModalSearch(prev as Record<string, unknown>)) as any,
          replace: true,
        });
      }
    }
  };

  return (
    <QuickDepositSheet
      open={open}
      onOpenChange={handleOpenChange}
      suggestedAmount={suggestedAmount}
    />
  );
}
