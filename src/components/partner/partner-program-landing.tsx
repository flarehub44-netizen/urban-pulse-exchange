import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Link2,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";
import { useAuth } from "@/hooks/use-auth";
import { useMyPartnerStatus, useApplyPartner } from "@/hooks/use-partner";
import { useQueryClient } from "@tanstack/react-query";
import { copy } from "@/copy/pt-BR";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const benefitIcons = [BarChart3, Wallet, Link2, Users] as const;

export function PartnerProgramLanding() {
  const { userId, isRegistered, authReady } = useAuth();
  const { data: partnerStatus, isLoading: statusLoading } = useMyPartnerStatus(!!userId);
  const { mutateAsync: applyPartner, isPending: applying } = useApplyPartner();
  const qc = useQueryClient();
  const [bio, setBio] = useState("");
  const [focusCity, setFocusCity] = useState("São Paulo");

  const isActivePartner =
    partnerStatus?.role === "partner" && partnerStatus?.status === "active";
  const isApplicant = partnerStatus?.role === "applicant";
  const canApply =
    authReady && userId && isRegistered && !isActivePartner && !isApplicant;

  const handleApply = async () => {
    try {
      const res = await applyPartner({
        bio,
        focusCity: focusCity.trim() || undefined,
      });
      const payload = res as { ok?: boolean; reason?: string };
      if (payload?.reason === "registration_required") {
        toast.error(copy.auth.registerRequired);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["account", "context"] });
      toast.success(copy.partner.applyPending);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : copy.errors.generic);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {copy.partner.applyTitle}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          {copy.partner.landing.heroTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {copy.partner.landing.heroSubtitle}
        </p>
        {isActivePartner && (
          <Link
            to="/partner"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {copy.partner.landing.ctaPortal} <ArrowRight className="size-4" />
          </Link>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{copy.partner.landing.benefitsTitle}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {copy.partner.landing.benefits.map((item, i) => {
            const Icon = benefitIcons[i] ?? Sparkles;
            return (
              <div
                key={item.title}
                className="rounded-xl border bg-card/50 p-4"
              >
                <Icon className="size-5 text-primary" />
                <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-xl border bg-card/40 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{copy.partner.landing.howTitle}</h2>
        <ol className="mt-4 space-y-3">
          {copy.partner.landing.steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="candidatura"
        className="mt-10 scroll-mt-24 rounded-xl border border-primary/20 bg-card p-5 sm:p-6"
      >
        <h2 className="text-lg font-semibold">{copy.partner.landing.formTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.partner.landing.formDesc}</p>

        {statusLoading && userId ? (
          <p className="mt-4 text-sm text-muted-foreground">{copy.common.loading}</p>
        ) : isActivePartner ? (
          <div className="mt-4 flex items-start gap-2 text-sm text-up">
            <CheckCircle2 className="size-5 shrink-0" />
            <span>{copy.partner.landing.alreadyPartner}</span>
          </div>
        ) : isApplicant ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-warn">{copy.partner.applyPending}</p>
            <Link
              to="/partner/pending"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              {copy.partner.pendingPageLink}
            </Link>
          </div>
        ) : !userId ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <AuthModalTrigger
              mode="signup"
              redirect="/parceiros#candidatura"
              className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {copy.partner.landing.ctaSignup}
            </AuthModalTrigger>
            <AuthModalTrigger
              mode="login"
              redirect="/parceiros#candidatura"
              className="inline-flex rounded-xl border px-4 py-2 text-sm hover:bg-surface"
            >
              {copy.partner.landing.ctaLogin}
            </AuthModalTrigger>
          </div>
        ) : !isRegistered ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-warn">{copy.auth.registerRequired}</p>
            <AuthModalTrigger
              mode="signup"
              redirect="/parceiros#candidatura"
              className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {copy.auth.registerCta}
            </AuthModalTrigger>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="partner-bio" className="text-xs font-medium text-muted-foreground">
                {copy.partner.landing.bioLabel}
              </label>
              <textarea
                id="partner-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={copy.partner.landing.bioPlaceholder}
                className="mt-1.5 w-full min-h-[120px] rounded-lg border bg-surface px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                {copy.partner.landing.bioMinHint}
              </p>
            </div>
            <div>
              <label htmlFor="partner-city" className="text-xs font-medium text-muted-foreground">
                {copy.partner.landing.cityLabel}
              </label>
              <input
                id="partner-city"
                type="text"
                value={focusCity}
                onChange={(e) => setFocusCity(e.target.value)}
                placeholder={copy.partner.landing.cityPlaceholder}
                className="mt-1.5 w-full rounded-lg border bg-surface px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={applying || bio.trim().length < 20}
              onClick={() => void handleApply()}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground",
                "hover:bg-primary/90 disabled:opacity-50 sm:w-auto",
              )}
            >
              {applying ? copy.common.loading : copy.partner.applyCta}
              {!applying && <ArrowRight className="size-4" />}
            </button>
          </div>
        )}

        <p className="mt-4 text-[10px] text-muted-foreground">
          <Link to="/settings" className="text-primary hover:underline">
            {copy.partner.landing.settingsLink}
          </Link>
        </p>
      </section>
    </div>
  );
}
