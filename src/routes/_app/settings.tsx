import { createFileRoute } from "@tanstack/react-router";
import { SettingsPanel } from "@/components/viax/settings-panel";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Configurações · ViaX" },
      {
        name: "description",
        content: "Gerencie conta, notificações e preferências da plataforma.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return <SettingsPanel />;
}
