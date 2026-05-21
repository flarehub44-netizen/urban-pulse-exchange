import { Link } from "@tanstack/react-router";
import { Bell, Moon, Shield, Info, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/copy/pt-BR";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { useAnonAuth } from "@/hooks/use-anon-auth";
import { useProfile } from "@/hooks/use-profile";
import { AdminDisputePanel } from "@/components/viax/admin-dispute-panel";
import { AdminCreateMarketForm } from "@/components/viax/admin-create-market-form";
import { AdminOpsPanel } from "@/components/viax/admin-ops-panel";

export function SettingsPanel() {
  const { prefs, update } = useNotificationPrefs();
  const { userId } = useAnonAuth();
  const { data: profile } = useProfile(userId);

  return (
    <div className="space-y-6">
      {profile?.isAdmin && (
        <Section icon={<Scale className="size-4" />} title={copy.settings.adminTitle}>
          <p className="text-xs text-muted-foreground">{copy.settings.adminDesc}</p>
          <AdminOpsPanel />
          <AdminCreateMarketForm />
          <AdminDisputePanel />
        </Section>
      )}
      <Section icon={<Bell className="size-4" />} title="Notificações">
        <Toggle
          label={copy.settings.winsGains}
          description="Receba alertas quando um mercado for resolvido a seu favor."
          checked={prefs.wins}
          onChange={(v) => update({ wins: v })}
        />
        <Toggle
          label="Novos mercados"
          description="Seja notificado quando novos mercados abrirem."
          checked={prefs.markets}
          onChange={(v) => update({ markets: v })}
        />
        <Toggle
          label="Mudanças no ranking"
          description="Aviso quando sua posição no ranking mudar."
          checked={prefs.ranking}
          onChange={(v) => update({ ranking: v })}
        />
        <Toggle
          label="Alertas urbanos"
          description="Eventos de trânsito e congestionamento detectados pela UrbanMind."
          checked={prefs.alerts}
          onChange={(v) => update({ alerts: v })}
        />
      </Section>

      <Section icon={<Shield className="size-4" />} title="Conta">
        <div className="rounded-xl border bg-card/40 p-4">
          <div className="text-sm font-medium">Conta anônima</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Vincule um e-mail na aba Visão geral do perfil para proteger seu histórico.
          </div>
          <Link
            to="/profile"
            search={{ tab: "visao" }}
            className="mt-3 inline-block rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-xs text-primary hover:bg-primary/20 transition"
          >
            Ir para perfil
          </Link>
        </div>
      </Section>

      <Section icon={<Moon className="size-4" />} title="Aparência">
        <div className="rounded-xl border bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Tema escuro</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Interface otimizada para ambientes com pouca luz.
              </div>
            </div>
            <div className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[10px] text-primary uppercase tracking-wider">
              Ativo
            </div>
          </div>
        </div>
      </Section>

      <Section icon={<Info className="size-4" />} title="Sobre">
        <div className="space-y-1">
          <InfoRow label="Versão" value="Beta 0.1.0" />
          <InfoRow label="Plataforma" value={copy.settings.platformName} />
          <InfoRow label="Resolução" value="Automática · UrbanMind AI" />
          <InfoRow label={copy.settings.houseRetention} value={copy.settings.houseRetentionValue} />
        </div>
        <div className="mt-3 rounded-xl border bg-primary/5 p-3 text-xs text-muted-foreground">
          {copy.settings.intro}
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          checked ? "bg-primary" : "bg-surface-2",
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface/40">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="mono text-xs text-foreground">{value}</span>
    </div>
  );
}
