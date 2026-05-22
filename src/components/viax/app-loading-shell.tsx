import { Skeleton } from "@/components/ui/skeleton";

export function AppLoadingShell() {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-border/60 lg:block">
          <div className="space-y-3 p-4">
            <Skeleton className="h-8 w-24" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </aside>
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border/60 px-4 lg:px-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="ml-auto h-8 w-40" />
          </header>
          <main className="flex-1 space-y-4 px-4 py-6 lg:px-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-2xl" />
          </main>
        </div>
      </div>
    </div>
  );
}
