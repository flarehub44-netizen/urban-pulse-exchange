import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Flag, Map, Sparkles, Users, ArrowRight } from "lucide-react";
import { copy } from "@/copy/pt-BR";

const pillars = [
  {
    icon: Map,
    title: copy.landing.segmentTransitoTitle,
    desc: copy.markets.segmentTransito,
    to: "/markets" as const,
    search: { segment: "transito" as const },
    cta: copy.landing.ctaTransito,
  },
  {
    icon: Flag,
    title: copy.landing.segmentFutebolTitle,
    desc: copy.markets.segmentFutebol,
    to: "/markets" as const,
    search: { segment: "futebol" as const },
    cta: copy.landing.ctaFutebol,
  },
  {
    icon: Sparkles,
    title: copy.landing.segmentOutrosTitle,
    desc: copy.markets.segmentOutros,
    to: "/markets" as const,
    search: { segment: "outros" as const },
    cta: copy.landing.ctaOutros,
    extra: true,
  },
] as const;

export function LandingSegmentPillars() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.18em] text-primary">
          {copy.landing.pillarsEyebrow}
        </div>
        <h2 className="heading-page mt-2 text-3xl md:text-4xl">{copy.landing.pillarsTitle}</h2>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {pillars.map((pillar, k) => {
          const { icon: Icon, title, desc, to, search, cta } = pillar;
          const extra = "extra" in pillar ? pillar.extra : false;
          return (

          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: k * 0.06 }}
            className="surface-card flex flex-col"
          >
            {extra && (
              <div className="mb-4 overflow-hidden rounded-lg border bg-surface/60">
                <div className="h-20 bg-gradient-to-br from-primary/20 via-surface-2 to-surface" />
                <div className="space-y-1 border-t px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Users className="size-3 text-primary" />
                    {copy.community.communityBadge}
                    <span className="ml-auto mono">{copy.landing.segmentOutrosMockTime}</span>
                  </div>
                  <p className="line-clamp-2 text-xs font-medium">
                    {copy.landing.segmentOutrosMockQuestion}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {copy.landing.segmentOutrosHint}
                  </p>
                </div>
              </div>
            )}
            <div className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{desc}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={to}
                search={search}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/25"
              >
                {cta} <ArrowRight className="size-3.5" />
              </Link>
              {extra && (
                <Link
                  to="/markets/create"
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-surface-2"
                >
                  {copy.landing.createMarketCta}
                </Link>
              )}
            </div>
          </motion.div>
          );
        })}


      </div>
    </section>
  );
}
