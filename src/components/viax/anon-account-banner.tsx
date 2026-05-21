import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAnonAuth } from "@/hooks/use-anon-auth";

export function AnonAccountBanner({ onProtect }: { onProtect?: () => void }) {
  const { userId } = useAnonAuth();
  const [isAnon, setIsAnon] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.auth.getUser().then(({ data }) => setIsAnon(!data.user?.email));
  }, [userId]);

  if (!isAnon) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/5 p-4">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
      <div className="flex-1 text-sm">
        <span className="font-medium text-warn">Conta anônima</span>
        <span className="ml-1 text-muted-foreground">
          — vincule um e-mail para não perder saldo e histórico.
        </span>
      </div>
      {onProtect ? (
        <button
          type="button"
          onClick={onProtect}
          className="shrink-0 rounded-xl border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs font-medium text-warn hover:bg-warn/20"
        >
          Proteger conta
        </button>
      ) : (
        <Link
          to="/profile"
          search={{ tab: "visao" }}
          className="shrink-0 rounded-xl border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs font-medium text-warn hover:bg-warn/20"
        >
          Proteger conta
        </Link>
      )}
    </div>
  );
}
