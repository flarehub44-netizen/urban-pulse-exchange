import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdminMfaPanel() {
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setEnrolled(false);
        return;
      }
      const totp = data.totp ?? [];
      setEnrolled(totp.some((f) => f.status === "verified"));
    })();
  }, []);

  async function startEnroll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      const factorId = data.id;
      const uri = data.totp?.uri;
      if (uri) {
        await navigator.clipboard.writeText(uri).catch(() => undefined);
        toast.info("URI TOTP copiada. Configure no app autenticador e confirme abaixo.");
      }
      const code = window.prompt("Digite o código de 6 dígitos do autenticador:");
      if (!code?.trim()) return;
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
      });
      if (verifyErr) throw verifyErr;
      toast.success("MFA ativado com sucesso.");
      setEnrolled(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao configurar MFA");
    } finally {
      setBusy(false);
    }
  }

  if (enrolled === null) {
    return <p className="text-sm text-muted-foreground">Verificando MFA…</p>;
  }

  return (
    <div className="rounded-lg border border-border/60 bg-surface/40 p-4">
      <h3 className="text-sm font-semibold">Autenticação em dois fatores (admin)</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Quando <code className="mono">admin_mfa_required</code> estiver ativo na plataforma, o
        painel exige sessão AAL2 (TOTP).
      </p>
      <p className="mt-2 text-sm">
        Status:{" "}
        <span className={enrolled ? "text-up font-medium" : "text-warn font-medium"}>
          {enrolled ? "Ativo" : "Não configurado"}
        </span>
      </p>
      {!enrolled && (
        <Button type="button" className="mt-3" size="sm" disabled={busy} onClick={() => void startEnroll()}>
          Configurar TOTP
        </Button>
      )}
    </div>
  );
}
