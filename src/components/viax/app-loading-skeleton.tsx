import { Brain } from "lucide-react";

export function AppLoadingSkeleton() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-background">
      <div className="flex items-center gap-2 text-primary">
        <Brain className="size-6 animate-pulse" />
        <span className="text-xl font-semibold tracking-tight">ViaX</span>
      </div>
      <div className="w-48 overflow-hidden rounded-full bg-surface">
        <div
          className="h-1 rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40"
          style={{
            backgroundSize: "200% 100%",
            animation: "shimmer 1.8s linear infinite",
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Carregando plataforma…</p>
    </div>
  );
}
