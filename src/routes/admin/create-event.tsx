import { Link } from "@tanstack/react-router";
import { Calendar, Flag, Layers, Radio, Sparkles, TrafficCone } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { copy } from "@/copy/pt-BR";

export const Route = createFileRoute("/admin/create-event")({
  component: AdminCreateEventHub,
});

const cards = [
  {
    title: "Mercado multi-outcome",
    desc: "Política, crypto, Copa, economia — N vias parimutuel",
    to: "/admin/markets",
    search: { tab: "multi" as const },
    icon: Layers,
  },
  {
    title: "Mercado urbano (yes/no)",
    desc: "Trânsito manual com região e target",
    to: "/admin/markets",
    search: { tab: "create" as const },
    icon: Radio,
  },
  {
    title: "Template trânsito (slot)",
    desc: "Evento recorrente 60s + gap — spawn automático",
    to: "/admin/traffic-events",
    icon: TrafficCone,
  },
  {
    title: "Evento sazonal",
    desc: "Campanha XP, badge e datas na plataforma",
    to: "/admin/events",
    icon: Sparkles,
  },
  {
    title: "Poll do dia",
    desc: "Enquete diária no hub de eventos",
    to: "/admin/events",
    icon: Calendar,
  },
  {
    title: "Futebol / fixture",
    desc: "Aprovar fixtures e publicar mercados 1X3",
    to: "/admin/football",
    icon: Flag,
  },
];

function AdminCreateEventHub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Criar evento</h1>
        <p className="text-xs text-muted-foreground">
          Hub unificado — escolha o tipo de evento ou mercado a publicar
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, desc, to, search, icon: Icon }) => (
          <Link
            key={title}
            to={to}
            search={search}
            className="group rounded-xl border border-border/70 bg-card/40 p-4 transition hover:border-primary/40 hover:bg-primary/5"
          >
            <Icon className="mb-3 size-5 text-primary" />
            <p className="font-medium group-hover:text-primary">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Crypto slots curto prazo: ative em{" "}
        <Link to="/admin/system" className="text-primary hover:underline">
          {copy.admin.nav.system}
        </Link>{" "}
        (`crypto_short_term_enabled`).
      </p>
    </div>
  );
}
