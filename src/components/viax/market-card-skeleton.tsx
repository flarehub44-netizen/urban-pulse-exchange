export function MarketCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border bg-card/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <div className="h-4 w-16 rounded-md bg-surface-2" />
          <div className="h-4 w-12 rounded-md bg-surface-2" />
        </div>
        <div className="h-4 w-16 rounded-md bg-surface-2" />
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-4 w-full rounded bg-surface-2" />
        <div className="h-4 w-3/4 rounded bg-surface-2" />
        <div className="mt-1 h-3 w-1/3 rounded bg-surface-2" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="h-7 w-16 rounded bg-surface-2" />
        <div className="h-10 flex-1 rounded bg-surface-2" />
        <div className="h-7 w-16 rounded bg-surface-2" />
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-surface-2" />
      <div className="mt-4 h-4 w-full rounded bg-surface-2" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-9 rounded-lg bg-surface-2" />
        <div className="h-9 rounded-lg bg-surface-2" />
      </div>
    </div>
  );
}
