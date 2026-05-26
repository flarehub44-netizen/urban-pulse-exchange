import { Link } from "@tanstack/react-router";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { Bell, Moon, Sun, Shield, Info, Scale, Sparkles } from "lucide-react";
import { useState } from "react";
import { useMyPartnerStatus, useApplyPartner } from "@/hooks/use-partner";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { copy } from "@/copy/pt-BR";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { useAuth } from "@/hooks/use-auth";
import { useAccountContext } from "@/hooks/use-account-context";
import { useProfile } from "@/hooks/use-profile";
import { AdminClaimPanel } from "@/components/viax/admin-claim-panel";
import { useCasinoSpinStatus } from "@/hooks/use-casino-spin";
import { setCasinoOptOutFn } from "@/actions/casino";
import { toast } from "sonner";

export function SettingsPanel() {
  const { prefs, update } = useNotificationPrefs();
  const { openLogin } = useAuthModal();
  const { userId, isRegistered } = useAuth();
  const { data: profile } = useProfile(userId);
  const { data: accountCtx } = useAccountContext(!!userId);
  const { data: partnerStatus } = useMyPartnerStatus(!!userId);
  const { mutateAsync: applyPartner, isPending: applying } = useApplyPartner();
  const [bio, setBio] = useState("");
  const { theme, setTheme, isDark } = useTheme();
  const { data: casinoStatus, refetch: refetchCasino } = useCasinoSpinStatus();
  const showCasinoSettings =
    !!userId &&
    (typeof import.meta.env.VITE_CASINO_ENABLED !== "string" ||
      import.meta.env.VITE_CASINO_ENABLED !== "false");
  const intenseOn = !casinoStatus?.opt_out;

  const onCasinoIntenseToggle = async (on: boolean) => {
    try {
      await setCasinoOptOutFn({ data: { optOut: !on } });
      await refetchCasino();
      toast.success(copy.responsiblePlay.optOutSaved);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : copy.errors.generic);
    }
  };

  return (
    <div className="space-y-6">
      {accountCtx?.admin?.can_claim_invite && !profile?.isAdmin && !accountCtx?.admin?.is_admin && (
        <Section icon={<Shield className="size-4" />} title={copy.settings.adminClaimTitle}>
          <AdminClaimPanel />
        </Section>
      )}
      <Section icon={<Sparkles className="size-4" />} title={copy.partner.applyTitle}>
        <p className="text-xs text-muted-foreground">{copy.partner.applyDesc}</p>
        {!isRegistered ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-warn">{copy.auth.registerRequired}</p>
            <AuthModalTrigger
              mode="signup"
              className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              {copy.auth.registerCta}
            </AuthModalTrigger>
          </div>
        ) : partnerStatus?.role === "partner" && partnerStatus.status === "active" ? (
          <Link
            to="/partner"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {copy.partner.portalCta}
          </Link>
        ) : partnerStatus?.role === "applicant" ? (
          <div className="space-y-2">
            <p className="text-sm text-warn">{copy.partner.applyPending}</p>
            <Link
              to="/partner/pending"
              className="inline-flex text-sm text-primary hover:underline"
            >
              {copy.partner.pendingPageLink}
            </Link>
          </div>
        ) : (
          <>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Por que você quer ser analista urbano na ViaX?"
              className="mt-2 w-full rounded-lg border bg-surface px-3 py-2 text-sm min-h-[80px]"
            />
            <button
              type="button"
              disabled={applying || bio.length < 20}
              onClick={async () => {
                try {
                  const res = await applyPartner({ bio });
                  const payload = res as { ok?: boolean; reason?: string };
                  if (payload?.reason === "registration_required") {
                    toast.error(copy.auth.registerRequired);
                    return;
                  }
                  toast.success(copy.partner.applyPending);
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : copy.errors.generic);
                }
              }}
              className="mt-2 rounded-lg border border-primary/40 bg-primary/15 px-4 py-2 text-sm text-primary disabled:opacity-50"
            >
              {copy.partner.applyCta}
            </button>
          </>
        )}
      </Section>

      {(profile?.isAdmin || accountCtx?.admin?.is_admin) && (
        <Section icon={<Scale className="size-4" />} title={copy.admin.title}>
          <p className="text-xs text-muted-foreground">
            Operações, liquidação e métricas no Control Center.
          </p>
          <Link
            to="/admin"
            className="inline-flex rounded-lg border border-primary/40 bg-primary/15 px-4 py-2 text-sm text-primary hover:bg-primary/20"
          >
            Abrir {copy.admin.title}
          </Link>
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
        <Toggle
          label={copy.retention.pushDigestLabel}
          description={copy.retention.pushDigestDesc}
          checked={prefs.pushDigest}
          onChange={(v) => {
            update({ pushDigest: v });
            if (v && typeof Notification !== "undefined" && Notification.permission === "default") {
              Notification.requestPermission().catch(() => undefined);
            }
          }}
        />
      </Section>

      <Section icon={<Shield className="size-4" />} title="Conta">
        <div className="rounded-xl border bg-card/40 p-4 space-y-3">
          {isRegistered ? (
            <p className="text-sm text-muted-foreground">
              Conta formal ativa com e-mail confirmado.
            </p>
          ) : (
            <>
              <div className="text-sm font-medium">Cadastro pendente</div>
              <p className="text-xs text-muted-foreground">{copy.auth.registerRequired}</p>
              <AuthModalTrigger
                mode="signup"
                className="inline-block rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-xs text-primary hover:bg-primary/20"
              >
                {copy.auth.registerCta}
              </AuthModalTrigger>
            </>
          )}
          {isRegistered && (
            <button
              type="button"
              onClick={async () => {
                const { signOut } = await import("@/lib/auth-actions");
                await signOut();
                openLogin();
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Sair da conta
            </button>
          )}
        </div>
      </Section>

      <Section
        icon={isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        title={copy.settings.themeTitle}
      >
        <div className="rounded-xl border bg-card/40 p-4 space-y-3">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition",
              theme === "dark"
                ? "border-primary/50 bg-primary/10"
                : "border-transparent hover:bg-surface/60",
            )}
          >
            <div>
              <div className="text-sm font-medium">{copy.settings.themeDark}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {copy.settings.themeDarkDesc}
              </div>
            </div>
            {theme === "dark" && (
              <span className="text-[10px] uppercase tracking-wider text-primary">Ativo</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition",
              theme === "light"
                ? "border-primary/50 bg-primary/10"
                : "border-transparent hover:bg-surface/60",
            )}
          >
            <div>
              <div className="text-sm font-medium">{copy.settings.themeLight}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {copy.settings.themeLightDesc}
              </div>
            </div>
            {theme === "light" && (
              <span className="text-[10px] uppercase tracking-wider text-primary">Ativo</span>
            )}
          </button>
        </div>
      </Section>

      {showCasinoSettings && (
        <Section icon={<Shield className="size-4" />} title={copy.responsiblePlay.settingsTitle}>
          <p className="text-xs text-muted-foreground">{copy.responsiblePlay.disclaimerShort}</p>
          <p className="text-xs text-muted-foreground">{copy.responsiblePlay.settingsDesc}</p>
          <Toggle
            label={intenseOn ? copy.responsiblePlay.intenseOn : copy.responsiblePlay.intenseOff}
            description={copy.responsiblePlay.settingsDesc}
            checked={intenseOn}
            onChange={(v) => void onCasinoIntenseToggle(v)}
          />
        </Section>
      )}

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
